import pandas as pd
import numpy as np
from typing import Any


def json_to_returns_df(data: dict) -> pd.DataFrame:
    """Convert JSON returns matrix to pandas DataFrame.

    Expected input:
    { "dates": [...], "assets": [...], "returns": [[...], ...] }
    """
    df = pd.DataFrame(
        data["returns"],
        index=pd.to_datetime(data["dates"]),
        columns=data["assets"],
    )
    return df.sort_index()


def json_to_prices_df(data: dict) -> pd.DataFrame:
    """Convert JSON prices to pandas DataFrame."""
    prices = data.get("prices", {})
    df = pd.DataFrame(prices, index=pd.to_datetime(data["dates"]))
    return df.sort_index()


def make_serializable(obj: Any) -> Any:
    """Recursively convert numpy types to Python natives for JSON."""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: make_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [make_serializable(v) for v in obj]
    return obj
