from fastapi import APIRouter, Request
import numpy as np
from api.utils.transforms import json_to_returns_df, make_serializable
from api.utils.response import error_response

router = APIRouter()


@router.post("/factor-analysis")
async def factor_analysis(request: Request):
    """Factor analysis: Fama-French regression or PCA."""
    data = await request.json()
    config = data.get("config", {})

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    model_type = config.get("type", "pca")

    if model_type == "pca":
        from sklearn.decomposition import PCA

        n_components = min(config.get("nFactors", 5), returns_df.shape[1])
        pca = PCA(n_components=n_components)
        pca.fit(returns_df.values)

        return make_serializable({
            "type": "pca",
            "explainedVariance": pca.explained_variance_ratio_.tolist(),
            "cumulativeVariance": np.cumsum(pca.explained_variance_ratio_).tolist(),
            "loadings": pca.components_.tolist(),
            "assets": returns_df.columns.tolist(),
        })

    elif model_type == "fama_french":
        import statsmodels.api as sm

        factors_data = data.get("factors", {})
        if not factors_data:
            # Use market proxy (equal-weighted portfolio) as single factor
            market = returns_df.mean(axis=1)
            results = {}
            for col in returns_df.columns:
                X = sm.add_constant(market.values)
                model = sm.OLS(returns_df[col].values, X).fit()
                results[col] = {
                    "alpha": float(model.params[0]) * 252,
                    "betas": {"market": float(model.params[1])},
                    "r_squared": float(model.rsquared),
                }
            return make_serializable({"type": "fama_french", "assets": results})

        import pandas as pd
        factors_df = pd.DataFrame(factors_data)
        factor_names = [c for c in factors_df.columns if c != "RF"]
        rf = factors_df["RF"].values if "RF" in factors_df.columns else np.zeros(len(factors_df))

        results = {}
        for col in returns_df.columns:
            y = returns_df[col].values[:len(rf)] - rf[:len(returns_df)]
            X = sm.add_constant(factors_df[factor_names].values[:len(y)])
            model = sm.OLS(y, X).fit()
            betas = {name: float(model.params[i + 1]) for i, name in enumerate(factor_names)}
            results[col] = {
                "alpha": float(model.params[0]) * 252,
                "betas": betas,
                "r_squared": float(model.rsquared),
            }
        return make_serializable({"type": "fama_french", "assets": results})

    error_response(400, f"Unknown model type: {model_type}")


@router.post("/correlations")
async def correlations(request: Request):
    """Correlation matrix, rolling correlations, and clustering."""
    data = await request.json()
    config = data.get("config", {})

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    corr = returns_df.corr().values
    assets = returns_df.columns.tolist()

    result = {
        "correlation": {"matrix": corr.tolist(), "labels": assets},
    }

    # Rolling correlation between two assets
    pair = config.get("pair", None)
    window = config.get("window", 63)
    if pair and len(pair) == 2 and pair[0] in assets and pair[1] in assets:
        rolling = returns_df[pair[0]].rolling(window).corr(returns_df[pair[1]])
        result["rollingCorrelation"] = {
            "dates": [d.isoformat() for d in returns_df.index[window - 1:]],
            "values": rolling.dropna().tolist(),
            "pair": pair,
            "window": window,
        }

    # Hierarchical clustering
    from scipy.cluster.hierarchy import linkage
    dist = np.sqrt(0.5 * (1 - corr))
    n = len(assets)
    tri = dist[np.triu_indices(n, k=1)]
    link = linkage(tri, method="ward")
    result["dendrogram"] = {"linkage": link.tolist(), "labels": assets}

    return make_serializable(result)


@router.post("/tactical")
async def tactical(request: Request):
    """Tactical allocation strategies."""
    data = await request.json()
    config = data.get("config", {})

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    strategy = config.get("strategy", "momentum")
    lookback = config.get("lookback", 252)
    assets = returns_df.columns.tolist()
    n = returns_df.shape[1]

    if strategy == "momentum":
        # 12-month return ranking
        period_returns = (1 + returns_df.tail(lookback)).prod() - 1
        scores = period_returns.values
        description = f"{lookback}-day momentum (total return ranking)"

    elif strategy == "mean_reversion":
        period_returns = (1 + returns_df.tail(21)).prod() - 1
        scores = -period_returns.values  # inverse: overweight losers
        description = "21-day mean reversion (overweight recent losers)"

    elif strategy == "risk_adjusted_momentum":
        period_returns = (1 + returns_df.tail(lookback)).prod() - 1
        vols = returns_df.tail(lookback).std() * np.sqrt(252)
        scores = (period_returns / vols).values
        scores = np.nan_to_num(scores, 0)
        description = "Risk-adjusted momentum (return / volatility)"

    elif strategy == "volatility_target":
        vols = returns_df.tail(lookback).std().values * np.sqrt(252)
        vols = np.maximum(vols, 1e-10)
        scores = 1.0 / vols
        description = "Inverse volatility weighting"

    elif strategy == "ma_crossover":
        # SMA(50) vs SMA(200) signal
        sma50 = returns_df.tail(50).mean().values
        sma200 = returns_df.tail(min(200, len(returns_df))).mean().values
        scores = np.where(sma50 > sma200, 1.0, 0.0)
        description = "Moving average crossover (50d vs 200d)"

    elif strategy == "dual_momentum":
        abs_mom = ((1 + returns_df.tail(lookback)).prod() - 1).values
        rel_scores = abs_mom - abs_mom.mean()
        scores = np.where(abs_mom > 0, rel_scores, 0)  # only hold if absolute momentum positive
        description = "Dual momentum (absolute + relative)"

    else:
        error_response(400, f"Unknown strategy: {strategy}")

    # Normalize to weights
    scores_pos = np.maximum(scores, 0)
    total = scores_pos.sum()
    weights = scores_pos / total if total > 0 else np.ones(n) / n

    result = {
        "strategy": strategy,
        "description": description,
        "signals": dict(zip(assets, scores.tolist())),
        "weights": dict(zip(assets, weights.tolist())),
        "lookback": lookback,
    }
    return make_serializable(result)
