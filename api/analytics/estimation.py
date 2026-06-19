from fastapi import APIRouter, Request
import numpy as np
from api.utils.transforms import json_to_returns_df, make_serializable
from api.utils.response import error_response

router = APIRouter()


@router.post("/estimate/returns")
async def estimate_returns(request: Request):
    """Estimate expected returns using various methods."""
    data = await request.json()
    config = data.get("config", {})

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    method = config.get("method", "empirical")
    asset_names = returns_df.columns.tolist()

    if method == "empirical":
        mu = returns_df.mean().values * 252
    elif method == "shrunk":
        # James-Stein shrinkage toward grand mean
        empirical = returns_df.mean().values
        grand_mean = empirical.mean()
        n = returns_df.shape[0]
        p = returns_df.shape[1]
        var_mu = returns_df.var().values / n
        total_var = var_mu.sum()
        shrinkage = max(0, min(1, (p - 2) * var_mu.mean() / (total_var + 1e-10)))
        mu = ((1 - shrinkage) * empirical + shrinkage * grand_mean) * 252
    elif method == "exponential":
        # Exponentially weighted mean
        halflife = config.get("halflife", 63)
        alpha = 1 - np.exp(-np.log(2) / halflife)
        n = returns_df.shape[0]
        ew_weights = np.array([(1 - alpha) ** i for i in range(n - 1, -1, -1)])
        ew_weights = ew_weights / ew_weights.sum()
        mu = (returns_df.values.T @ ew_weights) * 252
    elif method == "equilibrium":
        # CAPM equilibrium returns: π = δΣw
        cov = returns_df.cov().values * 252
        risk_aversion = config.get("riskAversion", 2.5)
        market_weights = np.ones(returns_df.shape[1]) / returns_df.shape[1]
        mu = risk_aversion * cov @ market_weights
    else:
        error_response(400, f"Unknown method: {method}")

    result = {
        "method": method,
        "returns": dict(zip(asset_names, mu.tolist())),
    }
    return make_serializable(result)


@router.post("/estimate/covariance")
async def estimate_covariance(request: Request):
    """Estimate covariance matrix using various methods."""
    data = await request.json()
    config = data.get("config", {})

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    method = config.get("method", "ledoit_wolf")
    asset_names = returns_df.columns.tolist()

    if method == "empirical":
        cov = returns_df.cov().values * 252
    elif method == "ledoit_wolf":
        from sklearn.covariance import LedoitWolf
        lw = LedoitWolf().fit(returns_df.values)
        cov = lw.covariance_ * 252
    elif method == "oas":
        from sklearn.covariance import OAS
        oas = OAS().fit(returns_df.values)
        cov = oas.covariance_ * 252
    elif method == "exponential":
        halflife = config.get("halflife", 63)
        cov = returns_df.ewm(halflife=halflife).cov().iloc[-len(asset_names):].values * 252
    elif method == "graphical_lasso":
        from sklearn.covariance import GraphicalLassoCV
        gl = GraphicalLassoCV().fit(returns_df.values)
        cov = gl.covariance_ * 252
    else:
        error_response(400, f"Unknown method: {method}")

    # Correlation matrix for heatmap
    diag = np.sqrt(np.diag(cov))
    diag = np.maximum(diag, 1e-10)
    corr = cov / np.outer(diag, diag)

    result = {
        "method": method,
        "covariance": {
            "matrix": cov.tolist(),
            "labels": asset_names,
        },
        "correlation": {
            "matrix": corr.tolist(),
            "labels": asset_names,
        },
    }
    return make_serializable(result)
