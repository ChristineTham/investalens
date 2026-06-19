from fastapi import HTTPException


def error_response(status: int, message: str):
    """Raise HTTP error with JSON detail."""
    raise HTTPException(status_code=status, detail=message)
