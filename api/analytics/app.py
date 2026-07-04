import os
import secrets

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .optimize import router as optimize_router
from .backtest import router as backtest_router
from .frontier import router as frontier_router
from .black_litterman import router as bl_router
from .estimation import router as estimation_router
from .monte_carlo import router as mc_router
from .stress_test import router as stress_router
from .factor_tactical import router as factor_router
from .stock_info import router as stock_info_router

app = FastAPI(title="InvestaLens Analytics API")


@app.middleware("http")
async def require_shared_secret(request: Request, call_next):
    """Require x-analytics-secret when ANALYTICS_SHARED_SECRET is set.

    Fails closed with 401 on mismatch. When the env var is unset (local dev)
    all requests are allowed. The /health endpoint is always exempt.
    """
    expected = os.environ.get("ANALYTICS_SHARED_SECRET")
    if expected and not request.url.path.endswith("/health"):
        provided = request.headers.get("x-analytics-secret") or ""
        if not secrets.compare_digest(provided, expected):
            return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await call_next(request)

app.include_router(optimize_router)
app.include_router(backtest_router)
app.include_router(frontier_router)
app.include_router(bl_router)
app.include_router(estimation_router)
app.include_router(mc_router)
app.include_router(stress_router)
app.include_router(factor_router)
app.include_router(stock_info_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
