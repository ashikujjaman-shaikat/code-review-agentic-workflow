# Agent — Node.js + Groq

Express server that runs multi-step AI code reviews using the Groq API (llama-3.3-70b-versatile).

## Prerequisites

- Node.js 18+
- A Groq API key — get one at https://console.groq.com/keys

## Setup

```bash
cp .env.example .env   # fill in GROQ_API_KEY
npm install
npm start              # or: npm run dev  (nodemon)
```

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | Yes | — | Your Groq API key |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Groq model to use |
| `PORT` | No | `8000` | Port the server listens on |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | Returns `{ "status": "ok" }` |
| `POST` | `/review` | Runs a code review pipeline |

### POST /review

**Request body**
```json
{ "code": "<your code string>" }
```

**Response fields**
```json
{
  "review":      "...",
  "issues":      "...",
  "suggestion":  "...",
  "final":       "...",
  "language":    "..."
}
```

## Graph flow

```
review → issues → suggestion → reflect
```

Each step calls the Groq LLM and passes its output to the next step via a typed state object.
