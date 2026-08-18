# OpenEx 3.0 — Simulated Crypto Exchange & AI Trading Terminal

A full-stack simulated cryptocurrency exchange built as a 15-day capstone project. Demonstrates production-grade backend engineering, real-time UI, and local AI integration.

## Architecture

| Service | Tech | Port |
|---|---|---|
| Backend API | Kotlin + Spring Boot 4 | 8080 |
| Frontend | React + Vite | 5173 |
| Market Data + AI | Python + Flask + LangChain + Ollama | 5001 |
| Database | PostgreSQL 16 | 5432 |

## Features

- **Double-entry ledger** — every transaction writes a balanced debit/credit pair; balances are always derived, never stored directly
- **Price-time priority matching engine** — incoming orders match against resting orders in the correct order; supports partial fills
- **Idempotent order submission** — duplicate requests (same Idempotency-Key) return the cached response instead of creating duplicate orders
- **JWT authentication** — stateless, token-based auth; every protected endpoint validates the token before processing
- **Live order book** — WebSocket (STOMP) broadcasts update the UI instantly when orders are placed or trades execute
- **Market data simulator** — random-walk-with-drift price series with 10/30-tick moving averages (NumPy + Pandas)
- **Agentic AI assistant** — local LLM (llama3.2 via Ollama + LangChain) with a registered tool that fetches the user's real wallet balance

## Running locally

### Prerequisites
- Java 17 (Temurin)
- Docker Desktop
- Node.js 18+
- Python 3.13+
- Ollama with llama3.2 pulled (`ollama pull llama3.2`)

### Start the backend
```bash
cd backend
docker-compose up -d        # starts Postgres
./gradlew bootRun
```

### Start the frontend
```bash
cd frontend
npm install
npm run dev
```

### Start the Python service
```bash
cd python-service
python -m venv venv
source venv/bin/activate    # Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | — | Register a new user |
| POST | /api/auth/login | — | Login, returns JWT |
| GET | /api/wallets | JWT | Get USD balance |
| POST | /api/wallets/deposit | JWT | Deposit simulated USD |
| POST | /api/orders | JWT + Idempotency-Key | Place a limit or market order |
| GET | /api/market/ticks | — | Simulated price feed with moving averages |
| POST | /api/chat | Optional JWT | AI assistant with wallet tool access |