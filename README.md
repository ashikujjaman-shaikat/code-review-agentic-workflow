# Agentic Code Reviewer

An AI-powered code review tool using:

- **Frontend**: React (Vite) — runs on port 5173
- **Agent**: Node.js (Express) with Groq SDK (llama-3.3-70b-versatile) — runs on port 8000

## Project layout

```
agentic-work-flow/
├─ agent/        # Node.js Express agent powered by Groq
├─ frontend/     # Vite + React frontend
└─ README.md
```

## Quick setup (macOS / Linux)

### 1) Start the agent

```bash
cd agent
cp .env.example .env        # fill in GROQ_API_KEY
npm install
npm start
```

### 2) Start the frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment variables

**agent/.env**

```
GROQ_API_KEY=your_groq_api_key_here   # get one at https://console.groq.com/keys
GROQ_MODEL=llama-3.3-70b-versatile    # optional, this is the default
PORT=8000                              # optional, defaults to 8000
```

## Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `http://localhost:8000/review` | Submit code for review |
| `GET`  | `http://localhost:8000/health` | Health check |

Request body for `/review`:

```json
{ "code": "<your code here>" }
```

Response fields: `review`, `issues`, `suggestion`, `final`, `language`

## Testing with curl

```bash
curl -X POST http://localhost:8000/review \
  -H "Content-Type: application/json" \
  -d '{"code":"function hello(){ console.log(\"hi\") }"}'
```

## Notes

- The agent implements a multi-step graph flow: review → issues → suggestion → reflect
- For production: restrict CORS, add authentication, and set appropriate rate limits
