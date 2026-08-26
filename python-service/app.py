import math
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
import market_simulator
from chat_agent import get_chat_response

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])


@app.route("/api/market/health", methods=["GET"])
def health():
    return jsonify({"status": "market data service online"})


@app.route("/api/market/ticks", methods=["GET"])
def get_ticks():
    # Advance the market by one tick on every poll, then return the full
    # running history. This keeps the feed continuous instead of regenerating
    # a brand new random series on every request.
    market_simulator.tick()
    df = market_simulator.get_price_series()
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
    try:
        data = request.get_json()
        user_message = data.get("message", "")
        jwt_token = request.headers.get("Authorization", "").replace("Bearer ", "") or None
        if not user_message:
            return jsonify({"error": "message is required"}), 400
        reply = get_chat_response(user_message, jwt_token)
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"reply": f"AI service error: {str(e)}. Check that Ollama is running."}), 200


if __name__ == "__main__":
    app.run(port=5001)
