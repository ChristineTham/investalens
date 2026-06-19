from fastapi import APIRouter, Request
import numpy as np
import pandas as pd
from api.utils.transforms import json_to_returns_df, make_serializable
from api.utils.response import error_response

router = APIRouter()


@router.post("/backtest")
async def backtest(request: Request):
    """Run walk-forward backtest with a given strategy."""
    data = await request.json()
    config = data.get("config", {})

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    strategy = config.get("strategy", "equal_weighted")
    rebalance_freq = config.get("rebalanceFrequency", "quarterly")

    # Rebalance periods
    test_days_map = {"monthly": 21, "quarterly": 63, "annually": 252}
    train_days = 252
    test_days = test_days_map.get(rebalance_freq, 63)

    n_assets = returns_df.shape[1]
    n_days = returns_df.shape[0]

    if n_days < train_days + test_days:
        error_response(400, f"Insufficient data: {n_days} days, need {train_days + test_days}")

    equity_curve = []
    weights_history = []
    rebalance_dates = []

    i = train_days
    while i < n_days:
        train = returns_df.iloc[max(0, i - train_days):i]
        test_end = min(i + test_days, n_days)
        test = returns_df.iloc[i:test_end]

        # Compute weights based on strategy
        weights = _compute_weights(strategy, train, n_assets)

        # Apply weights to test period
        portfolio_returns = (test.values * weights).sum(axis=1)
        equity_curve.extend(portfolio_returns.tolist())
        weights_history.append({
            "date": returns_df.index[i].isoformat(),
            "weights": dict(zip(returns_df.columns.tolist(), weights.tolist())),
        })
        rebalance_dates.append(returns_df.index[i].isoformat())

        i = test_end

    eq = np.array(equity_curve)
    cumulative = np.cumprod(1 + eq)

    # Metrics
    ann_return = float((cumulative[-1] ** (252 / len(eq))) - 1) if len(eq) > 0 else 0
    ann_vol = float(eq.std() * np.sqrt(252)) if len(eq) > 1 else 0
    sharpe = ann_return / ann_vol if ann_vol > 0 else 0

    peak = np.maximum.accumulate(cumulative)
    drawdown = (cumulative - peak) / peak
    max_dd = float(drawdown.min())

    downside = eq[eq < 0]
    sortino = float(ann_return / (downside.std() * np.sqrt(252))) if len(downside) > 1 else 0
    calmar = float(ann_return / abs(max_dd)) if max_dd != 0 else 0

    dates_out = [d.isoformat() for d in returns_df.index[-len(eq):]]

    result = {
        "annualizedReturn": ann_return,
        "annualizedVolatility": ann_vol,
        "sharpeRatio": sharpe,
        "maxDrawdown": max_dd,
        "calmarRatio": calmar,
        "sortinoRatio": sortino,
        "equityCurve": cumulative.tolist(),
        "dates": dates_out,
        "drawdownSeries": drawdown.tolist(),
        "weightsHistory": weights_history,
        "rebalanceDates": rebalance_dates,
        "assets": returns_df.columns.tolist(),
    }

    return make_serializable(result)


@router.post("/backtest/compare")
async def backtest_compare(request: Request):
    """Compare multiple strategies side-by-side."""
    data = await request.json()
    strategies = data.get("config", {}).get("strategies", ["equal_weighted", "min_variance", "max_sharpe"])
    rebalance_freq = data.get("config", {}).get("rebalanceFrequency", "quarterly")

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    results = []
    for strategy in strategies:
        config = {"strategy": strategy, "rebalanceFrequency": rebalance_freq}
        # Reuse backtest logic inline
        result = _run_backtest(returns_df, config)
        result["strategy"] = strategy
        results.append(result)

    # Rank by Sharpe
    results.sort(key=lambda r: r.get("sharpeRatio", 0), reverse=True)
    for i, r in enumerate(results):
        r["rank"] = i + 1

    return make_serializable({"strategies": results})


@router.post("/walk-forward")
async def walk_forward(request: Request):
    """Detailed walk-forward with per-window metrics."""
    data = await request.json()
    config = data.get("config", {})

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    strategy = config.get("strategy", "equal_weighted")
    rebalance_freq = config.get("rebalanceFrequency", "quarterly")
    test_days_map = {"monthly": 21, "quarterly": 63, "annually": 252}
    train_days = 252
    test_days = test_days_map.get(rebalance_freq, 63)

    n_assets = returns_df.shape[1]
    n_days = returns_df.shape[0]

    windows = []
    i = train_days
    while i < n_days:
        train = returns_df.iloc[max(0, i - train_days):i]
        test_end = min(i + test_days, n_days)
        test = returns_df.iloc[i:test_end]

        weights = _compute_weights(strategy, train, n_assets)

        # In-sample performance
        is_returns = (train.values * weights).sum(axis=1)
        is_sharpe = float(is_returns.mean() / is_returns.std() * np.sqrt(252)) if is_returns.std() > 0 else 0

        # Out-of-sample performance
        oos_returns = (test.values * weights).sum(axis=1)
        oos_sharpe = float(oos_returns.mean() / oos_returns.std() * np.sqrt(252)) if oos_returns.std() > 0 else 0

        windows.append({
            "start": returns_df.index[max(0, i - train_days)].isoformat(),
            "rebalanceDate": returns_df.index[i].isoformat(),
            "end": returns_df.index[test_end - 1].isoformat(),
            "inSampleSharpe": is_sharpe,
            "outOfSampleSharpe": oos_sharpe,
            "overfitRatio": is_sharpe / oos_sharpe if oos_sharpe != 0 else float("inf"),
            "outOfSampleReturn": float(np.prod(1 + oos_returns) - 1),
        })

        i = test_end

    return make_serializable({"windows": windows, "strategy": strategy})


@router.post("/cross-validate")
async def cross_validate(request: Request):
    """Compare models using walk-forward cross-validation."""
    data = await request.json()
    strategies = data.get("config", {}).get("strategies", ["equal_weighted", "min_variance", "max_sharpe", "risk_parity"])

    try:
        returns_df = json_to_returns_df(data)
    except Exception as e:
        error_response(400, f"Invalid returns data: {e}")

    results = []
    for strategy in strategies:
        config = {"strategy": strategy, "rebalanceFrequency": "quarterly"}
        result = _run_backtest(returns_df, config)
        results.append({
            "strategy": strategy,
            "sharpeRatio": result["sharpeRatio"],
            "annualizedReturn": result["annualizedReturn"],
            "annualizedVolatility": result["annualizedVolatility"],
            "maxDrawdown": result["maxDrawdown"],
            "calmarRatio": result["calmarRatio"],
            "sortinoRatio": result["sortinoRatio"],
        })

    results.sort(key=lambda r: r["sharpeRatio"], reverse=True)
    for i, r in enumerate(results):
        r["rank"] = i + 1

    return make_serializable({"models": results})


def _compute_weights(strategy: str, train_returns: pd.DataFrame, n_assets: int) -> np.ndarray:
    """Compute portfolio weights based on strategy."""
    if strategy == "equal_weighted":
        return np.ones(n_assets) / n_assets

    cov = train_returns.cov().values
    mean_returns = train_returns.mean().values

    if strategy == "min_variance":
        # Minimum variance: w = inv(Σ)·1 / 1'·inv(Σ)·1
        try:
            inv_cov = np.linalg.inv(cov)
            ones = np.ones(n_assets)
            w = inv_cov @ ones / (ones @ inv_cov @ ones)
            return np.maximum(w, 0) / np.maximum(w, 0).sum()  # long-only
        except np.linalg.LinAlgError:
            return np.ones(n_assets) / n_assets

    elif strategy == "max_sharpe":
        # Maximum Sharpe: w = inv(Σ)·μ / 1'·inv(Σ)·μ
        try:
            inv_cov = np.linalg.inv(cov)
            w = inv_cov @ mean_returns
            w = np.maximum(w, 0)
            total = w.sum()
            return w / total if total > 0 else np.ones(n_assets) / n_assets
        except np.linalg.LinAlgError:
            return np.ones(n_assets) / n_assets

    elif strategy == "risk_parity":
        # Risk parity: weight inversely proportional to volatility
        vols = np.sqrt(np.diag(cov))
        vols = np.maximum(vols, 1e-10)
        inv_vols = 1.0 / vols
        return inv_vols / inv_vols.sum()

    elif strategy == "mean_variance":
        # Same as max_sharpe for now
        try:
            inv_cov = np.linalg.inv(cov)
            w = inv_cov @ mean_returns
            w = np.maximum(w, 0)
            total = w.sum()
            return w / total if total > 0 else np.ones(n_assets) / n_assets
        except np.linalg.LinAlgError:
            return np.ones(n_assets) / n_assets

    else:
        return np.ones(n_assets) / n_assets


def _run_backtest(returns_df: pd.DataFrame, config: dict) -> dict:
    """Internal backtest runner."""
    strategy = config.get("strategy", "equal_weighted")
    rebalance_freq = config.get("rebalanceFrequency", "quarterly")
    test_days_map = {"monthly": 21, "quarterly": 63, "annually": 252}
    train_days = 252
    test_days = test_days_map.get(rebalance_freq, 63)

    n_assets = returns_df.shape[1]
    n_days = returns_df.shape[0]

    if n_days < train_days + test_days:
        return {"annualizedReturn": 0, "annualizedVolatility": 0, "sharpeRatio": 0,
                "maxDrawdown": 0, "calmarRatio": 0, "sortinoRatio": 0}

    equity_curve = []
    i = train_days
    while i < n_days:
        train = returns_df.iloc[max(0, i - train_days):i]
        test_end = min(i + test_days, n_days)
        test = returns_df.iloc[i:test_end]
        weights = _compute_weights(strategy, train, n_assets)
        portfolio_returns = (test.values * weights).sum(axis=1)
        equity_curve.extend(portfolio_returns.tolist())
        i = test_end

    eq = np.array(equity_curve)
    if len(eq) == 0:
        return {"annualizedReturn": 0, "annualizedVolatility": 0, "sharpeRatio": 0,
                "maxDrawdown": 0, "calmarRatio": 0, "sortinoRatio": 0}

    cumulative = np.cumprod(1 + eq)
    ann_return = float((cumulative[-1] ** (252 / len(eq))) - 1)
    ann_vol = float(eq.std() * np.sqrt(252))
    sharpe = ann_return / ann_vol if ann_vol > 0 else 0
    peak = np.maximum.accumulate(cumulative)
    max_dd = float(((cumulative - peak) / peak).min())
    downside = eq[eq < 0]
    sortino = float(ann_return / (downside.std() * np.sqrt(252))) if len(downside) > 1 else 0
    calmar = float(ann_return / abs(max_dd)) if max_dd != 0 else 0

    return {
        "annualizedReturn": ann_return,
        "annualizedVolatility": ann_vol,
        "sharpeRatio": sharpe,
        "maxDrawdown": max_dd,
        "calmarRatio": calmar,
        "sortinoRatio": sortino,
    }
