from fastapi import APIRouter, Request
import numpy as np
from api.utils.transforms import json_to_returns_df, make_serializable
from api.utils.response import error_response

router = APIRouter()


@router.post("/frontier")
async def frontier(request: Request):
    """Calculate the efficient frontier curve."""
    data = await request.json()
    config = data.get("config", {})

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    n_points = config.get("nPoints", 50)
    min_weight = config.get("minWeight", 0.0)
    max_weight = config.get("maxWeight", 1.0)

    n_assets = returns_df.shape[1]
    mean_returns = returns_df.mean().values
    cov_matrix = returns_df.cov().values

    try:
        inv_cov = np.linalg.inv(cov_matrix)
    except np.linalg.LinAlgError:
        error_response(500, "Singular covariance matrix")

    # Target return range
    min_ret = mean_returns.min() * 252
    max_ret = mean_returns.max() * 252
    target_returns = np.linspace(min_ret, max_ret, n_points)

    frontier_points = []
    for target in target_returns:
        try:
            # Solve for minimum variance at target return using Lagrangian
            daily_target = target / 252
            ones = np.ones(n_assets)

            # KKT system: [Σ, -μ, -1; μ', 0, 0; 1', 0, 0] [w; λ1; λ2] = [0; target; 1]
            A = np.zeros((n_assets + 2, n_assets + 2))
            A[:n_assets, :n_assets] = 2 * cov_matrix
            A[:n_assets, n_assets] = -mean_returns
            A[:n_assets, n_assets + 1] = -ones
            A[n_assets, :n_assets] = mean_returns
            A[n_assets + 1, :n_assets] = ones

            b = np.zeros(n_assets + 2)
            b[n_assets] = daily_target
            b[n_assets + 1] = 1.0

            solution = np.linalg.solve(A, b)
            w = solution[:n_assets]

            # Apply constraints
            w = np.clip(w, min_weight, max_weight)
            w = w / w.sum()

            port_ret = float(np.dot(w, mean_returns) * 252)
            port_vol = float(np.sqrt(np.dot(w, np.dot(cov_matrix * 252, w))))
            sharpe = port_ret / port_vol if port_vol > 0 else 0

            frontier_points.append({
                "return": port_ret,
                "risk": port_vol,
                "sharpe": sharpe,
                "weights": dict(zip(returns_df.columns.tolist(), w.tolist())),
            })
        except Exception:
            continue

    # Individual assets
    assets = []
    for i, col in enumerate(returns_df.columns):
        assets.append({
            "name": col,
            "return": float(mean_returns[i] * 252),
            "risk": float(returns_df[col].std() * np.sqrt(252)),
        })

    # Special points
    max_sharpe_pt = max(frontier_points, key=lambda x: x["sharpe"]) if frontier_points else None
    min_risk_pt = min(frontier_points, key=lambda x: x["risk"]) if frontier_points else None

    return make_serializable({
        "frontier": frontier_points,
        "assets": assets,
        "maxSharpe": max_sharpe_pt,
        "minRisk": min_risk_pt,
    })
