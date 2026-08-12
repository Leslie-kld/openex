import math
import pandas as pd
from flask import Flask, jsonify
from flask_cors import CORS
from market_simulator import generate_price_series

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])


@app.route("/api/market/health", methods=["GET"])
def health():
    return jsonify({"status": "market data service online"})


@app.route("/api/market/ticks", methods=["GET"])
def get_ticks():
    df = generate_price_series()
    records = df.to_dict(orient="records")

    for record in records:
        record["timestamp"] = record["timestamp"].isoformat()
        for key in ("moving_average_10", "moving_average_30"):
            value = record[key]
            if isinstance(value, float) and math.isnan(value):
                record[key] = None

    return jsonify(records)


if __name__ == "__main__":
    app.run(port=5001, debug=True)