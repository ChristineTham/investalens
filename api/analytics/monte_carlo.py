from fastapi import APIRouter, Request
import numpy as np
from api.utils.transforms import json_to_returns_df, make_serializable
from api.utils.response import error_response

router = APIRouter()


@router.post("/monte-carlo")
async def monte_carlo(request: Request):
    """Monte Carlo simulation with bootstrap, parametric, or copula methods."""
    data = await request.json()
    config = data.get("config", {})

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    method = config.get("method", "bootstrap")
    n_sims = min(config.get("nSimulations", 1000), 10000)
    horizon_days = config.get("horizonDays", 252)
    n_assets = returns_df.shape[1]
    weights = np.array(
        config.get("weights", [1.0 / n_assets] * n_assets)
    )
    initial_value = config.get("initialValue", 100000)
    annual_withdrawal = config.get("annualWithdrawal", 0)
    daily_withdrawal = annual_withdrawal / 252

    mu = returns_df.mean().values
    cov = returns_df.cov().values

    simulated_paths = []

    for _ in range(n_sims):
        if method == "bootstrap":
            idx = np.random.choice(len(returns_df), size=horizon_days, replace=True)
            sim_returns = returns_df.iloc[idx].values @ weights
        elif method == "parametric":
            sim_asset = np.random.multivariate_normal(mu, cov, size=horizon_days)
            sim_returns = sim_asset @ weights
        elif method == "copula":
            nu = 5
            chi2 = np.random.chisquare(nu, size=horizon_days)
            z = np.random.multivariate_normal(np.zeros(n_assets), cov, size=horizon_days)
            sim_asset = mu + z / np.sqrt(chi2[:, None] / nu)
            sim_returns = sim_asset @ weights
        else:
            error_response(400, f"Unknown method: {method}")

        path = np.empty(horizon_days)
        val = initial_value
        for i in range(horizon_days):
            val = val * (1 + sim_returns[i]) - daily_withdrawal
            path[i] = val
        simulated_paths.append(path)

    paths_arr = np.array(simulated_paths)
    final_values = paths_arr[:, -1]

    percentiles = [5, 10, 25, 50, 75, 90, 95]
    p5_val = float(np.percentile(final_values, 5))

    result = {
        "paths": paths_arr[:100].tolist(),
        "statistics": {
            "mean": float(np.mean(final_values)),
            "median": float(np.median(final_values)),
            "std": float(np.std(final_values)),
            "min": float(np.min(final_values)),
            "max": float(np.max(final_values)),
            "percentiles": {str(p): float(np.percentile(final_values, p)) for p in percentiles},
            "probLoss": float(np.mean(final_values < initial_value)),
            "probRuin": float(np.mean(final_values <= 0)),
            "var95": p5_val,
            "cvar95": float(np.mean(final_values[final_values <= p5_val])) if np.any(final_values <= p5_val) else p5_val,
        },
        "fanChart": {
            "dates": list(range(horizon_days)),
            "p5": np.percentile(paths_arr, 5, axis=0).tolist(),
            "p25": np.percentile(paths_arr, 25, axis=0).tolist(),
            "p50": np.percentile(paths_arr, 50, axis=0).tolist(),
            "p75": np.percentile(paths_arr, 75, axis=0).tolist(),
            "p95": np.percentile(paths_arr, 95, axis=0).tolist(),
        },
        "histogram": {
            "bins": np.histogram(final_values, bins=50)[1].tolist(),
            "counts": np.histogram(final_values, bins=50)[0].tolist(),
        },
    }
    return make_serializable(result)


@router.post("/fit-distribution")
async def fit_distribution(request: Request):
    """Fit univariate distributions to portfolio returns."""
    data = await request.json()

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    config = data.get("config", {})
    asset = config.get("asset", None)

    if asset and asset in returns_df.columns:
        values = returns_df[asset].values
    else:
        weights = np.ones(returns_df.shape[1]) / returns_df.shape[1]
        values = returns_df.values @ weights

    from scipy import stats

    fits = {}

    # Normal
    loc, scale = stats.norm.fit(values)
    ks_stat, ks_p = stats.kstest(values, "norm", args=(loc, scale))
    fits["normal"] = {
        "params": {"loc": float(loc), "scale": float(scale)},
        "ks_statistic": float(ks_stat),
        "ks_pvalue": float(ks_p),
    }

    # Student-t
    df_t, loc_t, scale_t = stats.t.fit(values)
    ks_stat_t, ks_p_t = stats.kstest(values, "t", args=(df_t, loc_t, scale_t))
    fits["student_t"] = {
        "params": {"df": float(df_t), "loc": float(loc_t), "scale": float(scale_t)},
        "ks_statistic": float(ks_stat_t),
        "ks_pvalue": float(ks_p_t),
    }

    # Skew normal
    a_sn, loc_sn, scale_sn = stats.skewnorm.fit(values)
    ks_stat_sn, ks_p_sn = stats.kstest(values, "skewnorm", args=(a_sn, loc_sn, scale_sn))
    fits["skew_normal"] = {
        "params": {"a": float(a_sn), "loc": float(loc_sn), "scale": float(scale_sn)},
        "ks_statistic": float(ks_stat_sn),
        "ks_pvalue": float(ks_p_sn),
    }

    # Best fit by KS p-value
    best = max(fits.items(), key=lambda x: x[1]["ks_pvalue"])

    return make_serializable({
        "fits": fits,
        "bestFit": best[0],
        "nObservations": len(values),
    })
