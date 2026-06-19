from fastapi import APIRouter, Request
import numpy as np
import pandas as pd
from api.utils.transforms import json_to_returns_df, make_serializable
from api.utils.response import error_response

router = APIRouter()


@router.post("/optimize")
async def optimize(request: Request):
    """Mean-Variance portfolio optimisation with multiple objectives and risk measures."""
    data = await request.json()
    config = data.get("config", {})

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    objective = config.get("objective", "max_sharpe")
    risk_measure = config.get("riskMeasure", "variance")
    min_weight = config.get("minWeight", 0.0)
    max_weight = config.get("maxWeight", 1.0)

    n_assets = returns_df.shape[1]
    mean_returns = returns_df.mean().values
    cov_matrix = returns_df.cov().values

    try:
        weights = _optimize_weights(
            mean_returns, cov_matrix, n_assets,
            objective, risk_measure, min_weight, max_weight, returns_df
        )
    except Exception as e:
        error_response(500, f"Optimization failed: {e}")

    # Portfolio metrics
    port_return = float(np.dot(weights, mean_returns) * 252)
    port_vol = float(np.sqrt(np.dot(weights, np.dot(cov_matrix * 252, weights))))
    sharpe = port_return / port_vol if port_vol > 0 else 0

    # CVaR
    port_daily = (returns_df.values @ weights)
    sorted_returns = np.sort(port_daily)
    var_idx = int(0.05 * len(sorted_returns))
    cvar_95 = float(-sorted_returns[:max(var_idx, 1)].mean()) if len(sorted_returns) > 0 else 0

    # Max drawdown
    cum = np.cumprod(1 + port_daily)
    peak = np.maximum.accumulate(cum)
    max_dd = float(((cum - peak) / peak).min())

    result = {
        "weights": dict(zip(returns_df.columns.tolist(), weights.tolist())),
        "expectedReturn": port_return,
        "expectedRisk": port_vol,
        "sharpeRatio": sharpe,
        "metrics": {
            "cvar95": cvar_95,
            "maxDrawdown": max_dd,
        },
    }
    return make_serializable(result)


@router.post("/optimize/hrp")
async def optimize_hrp(request: Request):
    """Hierarchical Risk Parity — no return estimation needed."""
    data = await request.json()

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    n_assets = returns_df.shape[1]
    cov = returns_df.cov().values
    corr = returns_df.corr().values

    # HRP implementation
    weights = _hrp_weights(cov, corr, n_assets)

    # Dendrogram data for visualization
    dist = np.sqrt(0.5 * (1 - corr))
    from scipy.cluster.hierarchy import linkage
    link = linkage(dist[np.triu_indices(n_assets, k=1)], method="ward")

    result = {
        "weights": dict(zip(returns_df.columns.tolist(), weights.tolist())),
        "dendrogram": {
            "linkage": link.tolist(),
            "labels": returns_df.columns.tolist(),
        },
    }
    return make_serializable(result)


@router.post("/optimize/risk-parity")
async def optimize_risk_parity(request: Request):
    """Risk Parity / Risk Budgeting optimization."""
    data = await request.json()
    config = data.get("config", {})

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    n_assets = returns_df.shape[1]
    budgets = config.get("budgets", [1.0 / n_assets] * n_assets)
    cov = returns_df.cov().values

    # Inverse volatility as starting point, then iterate
    vols = np.sqrt(np.diag(cov))
    vols = np.maximum(vols, 1e-10)
    weights = (1.0 / vols) * np.array(budgets)
    weights = weights / weights.sum()

    # Risk contribution
    port_vol = np.sqrt(weights @ cov @ weights)
    marginal = cov @ weights / port_vol
    risk_contrib = weights * marginal

    result = {
        "weights": dict(zip(returns_df.columns.tolist(), weights.tolist())),
        "riskContribution": dict(zip(returns_df.columns.tolist(), risk_contrib.tolist())),
        "portfolioRisk": float(port_vol * np.sqrt(252)),
    }
    return make_serializable(result)


def _optimize_weights(
    mean_returns, cov_matrix, n_assets,
    objective, risk_measure, min_weight, max_weight, returns_df
):
    """Compute optimal weights based on objective and risk measure."""
    try:
        inv_cov = np.linalg.inv(cov_matrix)
    except np.linalg.LinAlgError:
        return np.ones(n_assets) / n_assets

    if objective == "min_risk":
        ones = np.ones(n_assets)
        w = inv_cov @ ones / (ones @ inv_cov @ ones)
    elif objective == "max_sharpe":
        w = inv_cov @ mean_returns
    elif objective == "max_return":
        w = np.zeros(n_assets)
        w[np.argmax(mean_returns)] = 1.0
        return w
    else:
        w = inv_cov @ mean_returns

    # Apply constraints
    w = np.clip(w, min_weight, max_weight)
    total = w.sum()
    if total > 0:
        w = w / total
    else:
        w = np.ones(n_assets) / n_assets

    return w


def _hrp_weights(cov, corr, n_assets):
    """Hierarchical Risk Parity weight computation."""
    from scipy.cluster.hierarchy import linkage, leaves_list

    dist = np.sqrt(0.5 * (1 - corr))
    tri = dist[np.triu_indices(n_assets, k=1)]
    link = linkage(tri, method="ward")
    order = leaves_list(link)

    # Quasi-diagonal reordering
    weights = np.ones(n_assets)
    cluster_items = [[i] for i in order]

    # Bisection
    def _get_cluster_var(items):
        sub_cov = cov[np.ix_(items, items)]
        inv_diag = 1.0 / np.diag(sub_cov)
        inv_diag = inv_diag / inv_diag.sum()
        return float(inv_diag @ sub_cov @ inv_diag)

    items = list(order)
    clusters = [items]
    while len(clusters) < n_assets:
        new_clusters = []
        for cluster in clusters:
            if len(cluster) <= 1:
                new_clusters.append(cluster)
                continue
            mid = len(cluster) // 2
            left = cluster[:mid]
            right = cluster[mid:]
            new_clusters.append(left)
            new_clusters.append(right)
        clusters = new_clusters

    # Allocate by inverse variance at each bisection level
    items = list(order)

    def _recursive_bisect(items):
        if len(items) == 1:
            return {items[0]: 1.0}
        mid = len(items) // 2
        left = items[:mid]
        right = items[mid:]
        var_left = _get_cluster_var(left)
        var_right = _get_cluster_var(right)
        alpha = 1.0 - var_left / (var_left + var_right) if (var_left + var_right) > 0 else 0.5
        left_weights = _recursive_bisect(left)
        right_weights = _recursive_bisect(right)
        result = {}
        for k, v in left_weights.items():
            result[k] = v * alpha
        for k, v in right_weights.items():
            result[k] = v * (1.0 - alpha)
        return result

    weight_map = _recursive_bisect(items)
    result = np.zeros(n_assets)
    for idx, w in weight_map.items():
        result[idx] = w

    return result
