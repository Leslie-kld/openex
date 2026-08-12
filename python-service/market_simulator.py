import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone

def generate_price_series(
    start_price: float = 50000.0,
    num_ticks: int = 200,
    drift: float = 0.0002,
    volatility: float = 0.005,
    seed: int | None = None,
) -> pd.DataFrame:
    """
    Generates a simulated price series using a random walk with drift.

    Each tick's return is drawn from a normal distribution centered on `drift`
    (a small persistent upward bias, mimicking a mildly bullish market) with
    spread controlled by `volatility`. This is a standard, simple model for
    simulating asset prices — not predictive of anything real, just enough
    structure to look like a genuine market feed.
    """
    rng = np.random.default_rng(seed)

    returns = rng.normal(loc=drift, scale=volatility, size=num_ticks)
    price_multipliers = np.cumprod(1 + returns)
    prices = start_price * price_multipliers

    now = datetime.utcnow()
    timestamps = [now - timedelta(seconds=(num_ticks - i)) for i in range(num_ticks)]

    df = pd.DataFrame({
        "timestamp": timestamps,
        "price": prices,
    })

    df["moving_average_10"] = df["price"].rolling(window=10).mean()
    df["moving_average_30"] = df["price"].rolling(window=30).mean()

    return df