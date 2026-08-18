import math
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from market_simulator import generate_price_series
from chat_agent import get_chat_response

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


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")
    jwt_token = request.headers.get("Authorization", "").replace("Bearer ", "") or None
    if not user_message:
        return jsonify({"error": "message is required"}), 400
    reply = get_chat_response(user_message, jwt_token)
    return jsonify({"reply": reply})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)