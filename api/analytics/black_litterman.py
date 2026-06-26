from fastapi import APIRouter, Request
import numpy as np
from api.utils.transforms import json_to_returns_df, make_serializable
from api.utils.response import error_response

router = APIRouter()


@router.post("/black-litterman")
async def black_litterman(request: Request):
    """Black-Litterman model with absolute and relative views."""
    data = await request.json()
    config = data.get("config", {})

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    views = config.get("views", [])
    tau = config.get("tau", 0.05)
    risk_aversion = config.get("riskAversion", 2.5)

    n_assets = returns_df.shape[1]
    asset_names = returns_df.columns.tolist()
    cov = returns_df.cov().values * 252  # annualized

    # Market (prior) weights. Default: equal weight as a market-cap proxy.
    # When `config.priorWeights` is supplied (e.g. a model portfolio's target
    # weights keyed by asset code), use those as the equilibrium prior instead.
    prior_weights = config.get("priorWeights")
    if prior_weights:
        market_weights = np.array(
            [float(prior_weights.get(name, 0.0)) for name in asset_names]
        )
        total = market_weights.sum()
        market_weights = (
            market_weights / total if total > 0 else np.ones(n_assets) / n_assets
        )
    else:
        market_weights = np.ones(n_assets) / n_assets

    # Equilibrium (prior) returns: π = δΣw
    pi = risk_aversion * cov @ market_weights

    if not views:
        # No views — return equilibrium
        weights = market_weights
        posterior_returns = pi
    else:
        # Build P (pick matrix) and Q (view vector)
        n_views = len(views)
        P = np.zeros((n_views, n_assets))
        Q = np.zeros(n_views)
        omega_diag = np.zeros(n_views)

        for i, view in enumerate(views):
            confidence = view.get("confidence", 0.5)

            if view["type"] == "absolute":
                asset_idx = asset_names.index(view["asset"]) if view["asset"] in asset_names else -1
                if asset_idx < 0:
                    continue
                P[i, asset_idx] = 1.0
                Q[i] = view["value"]
            elif view["type"] == "relative":
                long_idx = asset_names.index(view["longAsset"]) if view["longAsset"] in asset_names else -1
                short_idx = asset_names.index(view["shortAsset"]) if view["shortAsset"] in asset_names else -1
                if long_idx < 0 or short_idx < 0:
                    continue
                P[i, long_idx] = 1.0
                P[i, short_idx] = -1.0
                Q[i] = view["value"]

            # Omega: uncertainty of views, scaled by confidence
            omega_diag[i] = (1.0 / confidence - 1.0) * (P[i] @ (tau * cov) @ P[i])

        Omega = np.diag(omega_diag)

        # Posterior returns: E[R] = [(τΣ)^(-1) + P'Ω^(-1)P]^(-1) [(τΣ)^(-1)π + P'Ω^(-1)Q]
        try:
            tau_cov_inv = np.linalg.inv(tau * cov)
            omega_inv = np.linalg.inv(Omega)
            M = np.linalg.inv(tau_cov_inv + P.T @ omega_inv @ P)
            posterior_returns = M @ (tau_cov_inv @ pi + P.T @ omega_inv @ Q)
        except np.linalg.LinAlgError:
            posterior_returns = pi

        # Optimal weights from posterior
        try:
            posterior_cov = cov + np.linalg.inv(tau_cov_inv + P.T @ omega_inv @ P)
            weights = np.linalg.inv(risk_aversion * posterior_cov) @ posterior_returns
            weights = np.maximum(weights, 0)
            total = weights.sum()
            weights = weights / total if total > 0 else market_weights
        except np.linalg.LinAlgError:
            weights = market_weights

    result = {
        "priorReturns": dict(zip(asset_names, pi.tolist())),
        "posteriorReturns": dict(zip(asset_names, posterior_returns.tolist())),
        "weights": dict(zip(asset_names, weights.tolist())),
        "tau": tau,
        "riskAversion": risk_aversion,
    }
    return make_serializable(result)
