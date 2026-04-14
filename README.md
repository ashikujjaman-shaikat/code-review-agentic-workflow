# Agentic Code Reviewer

An AI-powered, multi-step code review tool. Paste any code snippet and receive a structured review covering architecture, bugs, security vulnerabilities (OWASP Top 10), performance issues, and idiomatic style — with actionable suggestions and a patch.

## Overview

| Layer | Tech | Port |
|-------|------|------|
| Frontend | React 18 + Vite, `react-simple-code-editor`, PrismJS | 5173 |
| Agent backend | Node.js + Express, Groq SDK (`llama-3.3-70b-versatile`) | 8000 |

## How it works

The agent runs a **LangGraph-style 4-node pipeline** for each review request:

```
reviewNode → issuesNode → suggestionNode → reflectNode
```

1. **reviewNode** — auto-detects the language/framework and produces a senior-engineer paragraph review.
2. **issuesNode** — extracts up to 10 structured issues (title, severity, affected lines, explanation) as JSON.
3. **suggestionNode** — returns actionable suggestions and an optional improved code patch.
4. **reflectNode** — synthesises everything into a concise, immediately actionable final summary.

If the input is plain prose (not code), only the `reviewNode` runs and the user is informed politely.

## Supported languages & frameworks

React/JSX, Vue, Angular, Svelte, TypeScript, JavaScript, Node.js/Express, Python, Java, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, Dart/Flutter, SQL, Bash/Shell, Dockerfile, Kubernetes/YAML, HTML, CSS/SCSS, GraphQL, C/C++.

## Project layout

```
code-review-agentic-workflow/
├─ agent/
│  ├─ src/
│  │  ├─ server.js   # Express server — POST /api/review, GET /health
│  │  ├─ agent.js    # LangGraph orchestrator + 4 review nodes
│  │  └─ llm.js      # Groq API wrapper (chatCompletion, safeParseJson)
│  └─ package.json
├─ frontend/
│  ├─ src/
│  │  ├─ App.jsx     # Main UI — code editor, results rendering
│  │  ├─ api.js      # Axios client (VITE_API_URL → POST /api/review)
│  │  ├─ main.jsx    # React entry point
│  │  └─ styles.css  # CSS custom properties + component styles
│  ├─ index.html
│  ├─ vite.config.js
│  └─ package.json
└─ README.md
```

## Quick setup (macOS / Linux)

### 1. Start the agent

```bash
cd agent
cp .env.example .env   # add your GROQ_API_KEY (see below)
npm install
npm start              # production
# or
npm run dev            # nodemon watch mode
```

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## Environment variables

**`agent/.env`**

```env
GROQ_API_KEY=your_groq_api_key_here   # required — get one at https://console.groq.com/keys
GROQ_MODEL=llama-3.3-70b-versatile    # optional — this is the default
PORT=8000                              # optional — defaults to 8000
```

**`frontend/.env`** (optional)

```env
VITE_API_URL=http://localhost:8000    # optional — this is the default
```

## API reference

### `POST /api/review`

Submit a code snippet for review.

**Request body**

```json
{ "code": "<your code snippet>" }
```

**Response**

```json
{
  "language": "typescript",
  "review": "...",
  "issues": [
    { "title": "...", "severity": "high|medium|low", "lines": "10-15", "explanation": "..." }
  ],
  "suggestion": "...",
  "final": "..."
}
```

### `GET /health`

```json
{ "status": "ok" }
```

## Testing with curl

```bash
curl -X POST http://localhost:8000/api/review \
  -H "Content-Type: application/json" \
  -d '{"code":"function hello(){ console.log(\"hi\") }"}'
```

## Production notes

- Restrict CORS origins to your frontend domain (`cors({ origin: 'https://your-domain.com' })`).
- Add authentication (API key or OAuth) to `/api/review`.
- Set rate limits (e.g. `express-rate-limit`) to protect against abuse and Groq quota exhaustion.
- Store `GROQ_API_KEY` in a secrets manager — never commit it to source control.
