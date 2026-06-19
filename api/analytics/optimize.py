from fastapi import APIRouter

router = APIRouter()


@router.post("/optimize")
async def optimize():
    """Portfolio optimisation endpoint — placeholder."""
    return {"status": "not_implemented", "message": "R2 feature"}
