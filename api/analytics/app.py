from fastapi import FastAPI

from .optimize import router as optimize_router

app = FastAPI(title="InvestaLens Analytics API")

app.include_router(optimize_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
