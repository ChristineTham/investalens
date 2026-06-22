"""Rich stock information via yfinance.

Exposes POST /stock-info { "symbol": "BHP.AX" } and returns a normalised,
JSON-serialisable payload covering company profile, key stats, analyst
recommendations and price targets, calendar/earnings, recent news, a financials
summary, and corporate actions (dividends/splits).

Every section is wrapped defensively: yfinance attributes routinely raise or
return empty data, so a failure in one section never blocks the rest.
"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd
from fastapi import APIRouter, Request

from api.utils.response import error_response

router = APIRouter()


def _num(value: Any) -> float | None:
    """Coerce to a JSON-safe float, dropping NaN/inf and non-numerics."""
    try:
        if value is None:
            return None
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (TypeError, ValueError):
        return None


def _str(value: Any) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    return s or None


def _iso(value: Any) -> str | None:
    """Best-effort ISO-8601 date string from a pandas/py date-like value."""
    if value is None:
        return None
    try:
        if isinstance(value, pd.Timestamp):
            if pd.isna(value):
                return None
            return value.isoformat()
        ts = pd.to_datetime(value, errors="coerce")
        if ts is None or pd.isna(ts):
            return None
        return ts.isoformat()
    except Exception:
        return _str(value)


def _profile(info: dict) -> dict:
    return {
        "longName": _str(info.get("longName")),
        "shortName": _str(info.get("shortName")),
        "summary": _str(info.get("longBusinessSummary")),
        "website": _str(info.get("website")),
        "sector": _str(info.get("sector")),
        "industry": _str(info.get("industry")),
        "country": _str(info.get("country")),
        "city": _str(info.get("city")),
        "employees": info.get("fullTimeEmployees")
        if isinstance(info.get("fullTimeEmployees"), int)
        else None,
        "exchange": _str(info.get("exchange") or info.get("fullExchangeName")),
        "quoteType": _str(info.get("quoteType")),
        "currency": _str(info.get("currency")),
    }


def _stats(info: dict) -> dict:
    keys = [
        "marketCap",
        "enterpriseValue",
        "trailingPE",
        "forwardPE",
        "priceToBook",
        "priceToSalesTrailing12Months",
        "pegRatio",
        "beta",
        "trailingEps",
        "forwardEps",
        "dividendRate",
        "dividendYield",
        "payoutRatio",
        "fiftyTwoWeekHigh",
        "fiftyTwoWeekLow",
        "fiftyDayAverage",
        "twoHundredDayAverage",
        "previousClose",
        "regularMarketPrice",
        "profitMargins",
        "grossMargins",
        "operatingMargins",
        "returnOnEquity",
        "returnOnAssets",
        "revenueGrowth",
        "earningsGrowth",
        "totalRevenue",
        "ebitda",
        "debtToEquity",
        "currentRatio",
        "freeCashflow",
        "averageVolume",
        "sharesOutstanding",
        "bookValue",
        "targetMeanPrice",
        "targetHighPrice",
        "targetLowPrice",
        "recommendationMean",
    ]
    out: dict[str, float | None] = {}
    for k in keys:
        v = _num(info.get(k))
        if v is not None:
            out[k] = v
    rec = _str(info.get("recommendationKey"))
    if rec:
        out["recommendationKey"] = rec  # type: ignore[assignment]
    return out


def _analyst_targets(ticker) -> dict | None:
    try:
        t = ticker.get_analyst_price_targets()
        if not t:
            return None
        out = {
            k: _num(t.get(k)) for k in ("current", "low", "high", "mean", "median")
        }
        return out if any(v is not None for v in out.values()) else None
    except Exception:
        return None


def _recommendations(ticker) -> list[dict]:
    try:
        df = ticker.recommendations
        if df is None or len(df) == 0:
            return []
        rows: list[dict] = []
        for _, r in df.iterrows():
            rows.append(
                {
                    "period": _str(r.get("period")),
                    "strongBuy": int(_num(r.get("strongBuy")) or 0),
                    "buy": int(_num(r.get("buy")) or 0),
                    "hold": int(_num(r.get("hold")) or 0),
                    "sell": int(_num(r.get("sell")) or 0),
                    "strongSell": int(_num(r.get("strongSell")) or 0),
                }
            )
        return rows
    except Exception:
        return []


def _upgrades(ticker) -> list[dict]:
    try:
        df = ticker.upgrades_downgrades
        if df is None or len(df) == 0:
            return []
        df = df.sort_index(ascending=False).head(12)
        rows: list[dict] = []
        for idx, r in df.iterrows():
            rows.append(
                {
                    "date": _iso(idx),
                    "firm": _str(r.get("Firm")),
                    "toGrade": _str(r.get("ToGrade")),
                    "fromGrade": _str(r.get("FromGrade")),
                    "action": _str(r.get("Action")),
                }
            )
        return rows
    except Exception:
        return []


def _calendar(ticker) -> dict | None:
    try:
        cal = ticker.get_calendar()
        if not cal:
            return None
        earnings_dates = cal.get("Earnings Date") or []
        if not isinstance(earnings_dates, (list, tuple)):
            earnings_dates = [earnings_dates]
        out = {
            "earningsDates": [d for d in (_iso(x) for x in earnings_dates) if d],
            "exDividendDate": _iso(cal.get("Ex-Dividend Date")),
            "dividendDate": _iso(cal.get("Dividend Date")),
            "earningsHigh": _num(cal.get("Earnings High")),
            "earningsLow": _num(cal.get("Earnings Low")),
            "earningsAverage": _num(cal.get("Earnings Average")),
            "revenueHigh": _num(cal.get("Revenue High")),
            "revenueLow": _num(cal.get("Revenue Low")),
            "revenueAverage": _num(cal.get("Revenue Average")),
        }
        return out if any(v for v in out.values()) else None
    except Exception:
        return None


def _news(ticker) -> list[dict]:
    try:
        items = ticker.get_news(count=8)
    except Exception:
        try:
            items = ticker.news
        except Exception:
            return []
    if not items:
        return []
    out: list[dict] = []
    for it in items[:8]:
        # Newer yfinance nests fields under "content"
        content = it.get("content") if isinstance(it, dict) else None
        if content:
            provider = content.get("provider") or {}
            url = (content.get("canonicalUrl") or {}).get("url") or (
                content.get("clickThroughUrl") or {}
            ).get("url")
            out.append(
                {
                    "title": _str(content.get("title")),
                    "summary": _str(content.get("summary")),
                    "publisher": _str(provider.get("displayName")),
                    "link": _str(url),
                    "publishedAt": _iso(content.get("pubDate")),
                }
            )
        elif isinstance(it, dict):
            out.append(
                {
                    "title": _str(it.get("title")),
                    "summary": _str(it.get("summary")),
                    "publisher": _str(it.get("publisher")),
                    "link": _str(it.get("link")),
                    "publishedAt": _iso(
                        it.get("providerPublishTime") and
                        pd.to_datetime(it.get("providerPublishTime"), unit="s")
                    ),
                }
            )
    return [n for n in out if n.get("title")]


def _financials(ticker) -> dict | None:
    """Extract a compact annual income-statement summary."""
    try:
        df = ticker.income_stmt
        if df is None or df.empty:
            return None

        def _row(label_options: list[str]) -> dict[str, float | None]:
            for label in label_options:
                if label in df.index:
                    series = df.loc[label]
                    return {
                        _iso(col)[:10] if _iso(col) else str(col): _num(val)
                        for col, val in series.items()
                    }
            return {}

        revenue = _row(["Total Revenue", "Operating Revenue"])
        net_income = _row(["Net Income", "Net Income Common Stockholders"])
        gross = _row(["Gross Profit"])
        ebitda = _row(["EBITDA", "Normalized EBITDA"])

        years = sorted(
            {k for d in (revenue, net_income, gross, ebitda) for k in d.keys()},
            reverse=True,
        )[:5]
        if not years:
            return None

        return {
            "years": years,
            "revenue": [revenue.get(y) for y in years],
            "netIncome": [net_income.get(y) for y in years],
            "grossProfit": [gross.get(y) for y in years],
            "ebitda": [ebitda.get(y) for y in years],
        }
    except Exception:
        return None


def _actions(ticker) -> dict | None:
    try:
        out: dict[str, list] = {"dividends": [], "splits": []}
        try:
            div = ticker.dividends
            if div is not None and len(div) > 0:
                div = div.tail(24)
                out["dividends"] = [
                    {"date": _iso(idx), "amount": _num(val)}
                    for idx, val in div.items()
                    if _num(val)
                ]
        except Exception:
            pass
        try:
            spl = ticker.splits
            if spl is not None and len(spl) > 0:
                spl = spl.tail(12)
                out["splits"] = [
                    {"date": _iso(idx), "ratio": _num(val)}
                    for idx, val in spl.items()
                    if _num(val)
                ]
        except Exception:
            pass
        if not out["dividends"] and not out["splits"]:
            return None
        return out
    except Exception:
        return None


@router.post("/stock-info")
async def stock_info(request: Request):
    """Return rich stock information for a single Yahoo Finance symbol."""
    data = await request.json()
    symbol = (data.get("symbol") or "").strip()
    if not symbol:
        error_response(400, "Missing 'symbol'")

    try:
        import yfinance as yf
    except Exception as e:  # pragma: no cover
        error_response(500, f"yfinance unavailable: {e}")

    try:
        ticker = yf.Ticker(symbol)
    except Exception as e:
        error_response(502, f"Could not initialise ticker: {e}")

    try:
        info = ticker.info or {}
    except Exception:
        info = {}

    # A valid equity/ETF should expose at least a name or price.
    has_profile = bool(
        info.get("longName") or info.get("shortName") or info.get("regularMarketPrice")
    )

    payload = {
        "symbol": symbol,
        "found": has_profile,
        "profile": _profile(info),
        "stats": _stats(info),
        "analystTargets": _analyst_targets(ticker),
        "recommendations": _recommendations(ticker),
        "upgrades": _upgrades(ticker),
        "calendar": _calendar(ticker),
        "news": _news(ticker),
        "financials": _financials(ticker),
        "actions": _actions(ticker),
    }
    return payload
