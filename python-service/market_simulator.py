import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from collections import deque
import threading

# ── Persistent, continuously-growing price state ─────────────────────────────
# Unlike a stateless generator that would produce a brand new random walk on
# every call, this module keeps the running series in memory and appends
# exactly one new tick per call (or per tick cycle). This is what makes the
# feed feel like a real, continuous market instead of a new fake universe
# every few seconds.

_LOCK = threading.Lock()
_MAX_HISTORY = 500
_DRIFT = 0.0002
_VOLATILITY = 0.004

_state = {
    "price": 50000.0,
    "history": deque(maxlen=_MAX_HISTORY),
}


def _seed_if_empty():
    if _state["history"]:
        return
    rng = np.random.default_rng()
    now = datetime.now(timezone.utc)
    price = _state["price"]
    for i in range(100):
        ret = rng.normal(loc=_DRIFT, scale=_VOLATILITY)
        price = price * (1 + ret)
        ts = now - timedelta(seconds=(100 - i))
        _state["history"].append({"timestamp": ts, "price": price})
    _state["price"] = price


def tick() -> None:
    """Advance the market by exactly one tick, appending to the running history."""
    with _LOCK:
        _seed_if_empty()
        rng = np.random.default_rng()
        ret = rng.normal(loc=_DRIFT, scale=_VOLATILITY)
        new_price = _state["price"] * (1 + ret)
        _state["price"] = new_price
        _state["history"].append({
            "timestamp": datetime.now(timezone.utc),
            "price": new_price,
        })


def get_price_series() -> pd.DataFrame:
    """Returns the current running history (does not generate new data)."""
    with _LOCK:
        _seed_if_empty()
        df = pd.DataFrame(list(_state["history"]))

    df["moving_average_10"] = df["price"].rolling(window=10).mean()
    df["moving_average_30"] = df["price"].rolling(window=30).mean()
    return df


def get_current_price() -> float:
    with _LOCK:
        _seed_if_empty()
        return _state["price"]
