from fastapi import APIRouter, Request
import numpy as np
from api.utils.transforms import json_to_returns_df, make_serializable
from api.utils.response import error_response

router = APIRouter()

# Historical crisis scenarios (approximate daily returns for key periods)
HISTORICAL_SCENARIOS = {
    "GFC (2008-09)": {"market_return": -0.50, "duration_days": 126, "description": "Global Financial Crisis"},
    "COVID-19 (2020)": {"market_return": -0.34, "duration_days": 23, "description": "COVID crash, fast recovery"},
    "Dot-com (2000-02)": {"market_return": -0.49, "duration_days": 630, "description": "Tech bubble burst"},
    "2022 Rate Shock": {"market_return": -0.25, "duration_days": 189, "description": "Stocks + bonds fell together"},
    "Black Monday (1987)": {"market_return": -0.22, "duration_days": 1, "description": "Single-day crash"},
    "Asian Crisis (1997)": {"market_return": -0.35, "duration_days": 252, "description": "EM currency collapse"},
}


@router.post("/stress-test/historical")
async def stress_test_historical(request: Request):
    """Apply historical crisis scenarios to current portfolio."""
    data = await request.json()

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    weights = np.array(data.get("weights", [1.0 / returns_df.shape[1]] * returns_df.shape[1]))

    # Calculate betas for each asset
    port_returns = returns_df.values @ weights
    betas = []
    for i in range(returns_df.shape[1]):
        cov_with_port = np.cov(returns_df.iloc[:, i].values, port_returns)[0, 1]
        var_port = np.var(port_returns)
        beta = cov_with_port / var_port if var_port > 0 else 1.0
        betas.append(beta)
    betas = np.array(betas)

    scenarios = []
    for name, scenario in HISTORICAL_SCENARIOS.items():
        market_return = scenario["market_return"]
        # Asset-level impact via beta
        asset_impacts = betas * market_return
        portfolio_impact = float(np.dot(weights, asset_impacts))

        asset_contributions = {}
        for j, col in enumerate(returns_df.columns):
            asset_contributions[col] = float(weights[j] * asset_impacts[j])

        scenarios.append({
            "name": name,
            "description": scenario["description"],
            "durationDays": scenario["duration_days"],
            "marketReturn": market_return,
            "portfolioImpact": portfolio_impact,
            "assetContributions": asset_contributions,
        })

    # Sort by worst impact
    scenarios.sort(key=lambda s: s["portfolioImpact"])

    return make_serializable({"scenarios": scenarios})


@router.post("/stress-test/custom")
async def stress_test_custom(request: Request):
    """Apply user-defined per-asset shocks."""
    data = await request.json()
    config = data.get("config", {})

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    weights = np.array(data.get("weights", [1.0 / returns_df.shape[1]] * returns_df.shape[1]))
    shocks = config.get("shocks", {})

    asset_names = returns_df.columns.tolist()
    shock_vector = np.zeros(len(asset_names))
    for i, name in enumerate(asset_names):
        shock_vector[i] = shocks.get(name, 0)

    portfolio_impact = float(np.dot(weights, shock_vector))

    contributions = {}
    for i, name in enumerate(asset_names):
        contributions[name] = {
            "shock": float(shock_vector[i]),
            "weight": float(weights[i]),
            "contribution": float(weights[i] * shock_vector[i]),
        }

    return make_serializable({
        "portfolioImpact": portfolio_impact,
        "contributions": contributions,
    })


@router.post("/stress-test/factor")
async def stress_test_factor(request: Request):
    """Conditional stress: 'if market drops X%, what happens?'"""
    data = await request.json()
    config = data.get("config", {})

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    weights = np.array(data.get("weights", [1.0 / returns_df.shape[1]] * returns_df.shape[1]))
    factor_shock = config.get("factorShock", -0.10)

    # Use portfolio as the factor proxy
    port_returns = returns_df.values @ weights

    # Calculate beta of each asset to portfolio
    asset_impacts = {}
    total_impact = 0.0
    for i, col in enumerate(returns_df.columns):
        cov_val = np.cov(returns_df.iloc[:, i].values, port_returns)[0, 1]
        var_port = np.var(port_returns)
        beta = cov_val / var_port if var_port > 0 else 1.0
        conditional_return = beta * factor_shock
        contribution = weights[i] * conditional_return

        asset_impacts[col] = {
            "beta": float(beta),
            "conditionalReturn": float(conditional_return),
            "weight": float(weights[i]),
            "contribution": float(contribution),
        }
        total_impact += contribution

    return make_serializable({
        "factorShock": factor_shock,
        "portfolioImpact": total_impact,
        "assetImpacts": asset_impacts,
    })
