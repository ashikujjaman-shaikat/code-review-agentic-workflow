# Agentic Code Reviewer

An **autonomous AI-powered code review system** that combines multi-step analysis with intelligent decision-making. Paste any code snippet and receive a comprehensive review covering architecture, bugs, security vulnerabilities (OWASP Top 10), performance issues, and idiomatic style — with actionable suggestions, patches, and self-verification.

## Key Features

🤖 **Autonomous Agent Design** — Self-healing retry logic, schema validation, and quality self-assessment  
🔀 **Conditional Execution** — Dynamic branching based on runtime analysis  
🛠️ **Tool Integration** — Suggests external tools (linters, security scanners) based on findings  
✅ **Self-Verification** — Validates its own outputs with quality scoring  
⚡ **Resilient** — Automatic retry with exponential backoff for transient failures  
🎯 **Multi-Language** — Supports 25+ languages and frameworks

## Overview

| Layer | Tech | Port |
|-------|------|------|
| Frontend | React 18 + Vite, `react-simple-code-editor`, PrismJS | 5173 |
| Agent Backend | Node.js + Express, Groq SDK, LangGraph | 8000 |
| **Agenticity Level** | **6/10** — Autonomous decision-making & self-validation | |

## How It Works

The agent orchestrates an **intelligent 6-node pipeline** with conditional execution:

```
reviewNode → issuesNode → suggestionNode → reflectNode → verificationNode → toolExecutorNode
                                                                  ↓
                                                          Early Exit if Low Quality
```

### Core Nodes

1. **reviewNode** — Auto-detects language/framework and produces a senior-engineer architectural review
2. **issuesNode** — Extracts up to 10 structured issues (validated against schema) with severity, lines, and explanations
3. **suggestionNode** — Returns actionable improvements and an optional code patch
4. **reflectNode** — Synthesizes findings into a concise, immediately actionable summary

### Autonomous Enhancement Nodes

5. **verificationNode** ✅ — Self-assesses output quality across 5 dimensions (completeness, relevance, actionability)
   - Calculates quality score (0-100%)
   - Logs warnings if score < 60%
   - Enables early termination for low-quality outputs

6. **toolExecutorNode** 🛠️ — Conditionally executed only when issues are detected
   - Suggests external tools based on findings (security scanners, formatters, linters)
   - Skipped automatically if no significant issues found
   - Extensible framework for future automation

### Intelligent Behaviors

- **Retry Logic**: Automatic retry up to 3 times with exponential backoff for API failures
- **Schema Validation**: All JSON outputs validated against expected schemas
- **Conditional Branching**: Tool executor runs only if `criticalIssueCount > 0` or `issues.length > 3`
- **Graceful Degradation**: Falls back to text responses when JSON parsing fails

If the input is plain prose (not code), only the `reviewNode` runs and the user is politely informed.

## Supported Languages & Frameworks

React/JSX, Vue, Angular, Svelte, TypeScript, JavaScript, Node.js/Express, Python, Java, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, Dart/Flutter, SQL, Bash/Shell, Dockerfile, Kubernetes/YAML, HTML, CSS/SCSS, GraphQL, C/C++.

## Architecture & Agenticity

### What Makes This Agent Autonomous?

This system achieves a **6/10 agenticity level** through:

| Feature | Description | Impact |
|---------|-------------|--------|
| **Retry with Backoff** | Automatic retry (max 3) with exponential backoff and jitter | Handles transient failures without human intervention |
| **Schema Validation** | Validates all JSON outputs against predefined schemas | Self-corrects malformed responses |
| **Conditional Execution** | Nodes can be skipped based on runtime state | Optimizes execution path dynamically |
| **Self-Verification** | Evaluates output quality across 5 metrics | Catches low-quality outputs autonomously |
| **Tool Suggestions** | Recommends external tools based on findings | Extends capabilities beyond analysis |
| **State Management** | Tracks critical issues, quality scores, retry counts | Enables intelligent decision-making |

### Quality Metrics (Verification Node)

The agent self-assesses every output:

1. ✅ Review completeness (> 50 chars)
2. ✅ Issues detected (array with content)
3. ✅ Suggestion quality (actionable recommendations)
4. ✅ Final summary present
5. ✅ Language detected

**Quality Score** = (passed checks / 5) × 100%  
**Warning Threshold** = 60%

## Project Layout

```
code-review-agentic-workflow/
├─ agent/
│  ├─ src/
│  │  ├─ server.js   # Express server — POST /api/review, GET /health
│  │  ├─ agent.js    # LangGraph orchestrator + 6 autonomous nodes
│  │  │              # • Conditional execution support
│  │  │              # • Self-verification node
│  │  │              # • Tool executor framework
│  │  └─ llm.js      # Groq API wrapper
│  │                 # • Retry logic with exponential backoff
│  │                 # • Schema validation (safeParseJson)
│  │                 # • Error classification
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
├─ AGENTICITY_IMPROVEMENTS.md  # Detailed documentation of autonomous features
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

## API Reference

### `POST /api/review`

Submit a code snippet for review.

**Request Body**

```json
{ "code": "<your code snippet>" }
```

**Response**

```json
{
  "language": "typescript",
  "review": "Architectural analysis and overview...",
  "issues": [
    {
      "title": "SQL Injection vulnerability",
      "severity": "critical",
      "lines": "10-15",
      "explanation": "Direct string interpolation in SQL query..."
    }
  ],
  "suggestion": "Actionable recommendations and code patch...",
  "final": "Executive summary of findings...",
  
  // Agenticity enhancement fields
  "criticalIssueCount": 1,
  "verificationScore": 100,
  "verificationChecks": {
    "hasReview": true,
    "hasIssues": true,
    "hasSuggestion": true,
    "hasFinal": true,
    "languageDetected": true
  },
  "suggestedTools": [
    {
      "tool": "sql-injection-scanner",
      "reason": "1 critical issue(s) detected",
      "command": "npm run security-scan",
      "autoExecute": false
    }
  ]
}
```

**Response Fields**

| Field | Type | Description |
|-------|------|-------------|
| `language` | `string` | Auto-detected programming language |
| `review` | `string` | Senior-level architectural analysis |
| `issues` | `array` | Structured issues with severity & line numbers |
| `suggestion` | `string` | Actionable improvements with optional patch |
| `final` | `string` | Concise executive summary |
| `criticalIssueCount` | `number` | Count of critical/high severity issues |
| `verificationScore` | `number` | Self-assessment quality score (0-100) |
| `verificationChecks` | `object` | Breakdown of 5 quality checks |
| `suggestedTools` | `array` | Recommended external tools based on findings |

### `GET /health`

Health check endpoint.

```json
{ "status": "ok" }
```

## Testing

### Agenticity Test Suite

Verify all autonomous features with the included test script:

```bash
cd agent
node test-agenticity.js
```

This runs 3 test scenarios:

1. **Critical Security Issue Detection** — Validates tool suggestions and issue counting
2. **Low Quality Output Detection** — Verifies quality warnings trigger correctly  
3. **High Quality Code Analysis** — Confirms verification passes on good code

**Expected Output**:
```
🧪 Testing Agenticity Improvements
============================================================

📋 Test 1: Critical Security Issue Detection
------------------------------------------------------------
✅ Language detected: javascript
✅ Issues found: 2
✅ Critical issues: 1
✅ Verification score: 100%
✅ Suggested tools: 1
   Tools: security-scan

📋 Test 2: Low Quality Output Detection
------------------------------------------------------------
✅ Review length: 89 chars
✅ Verification score: 80%
⚠️  Quality warning detected: Output quality below threshold

📋 Test 3: High Quality Code Analysis
------------------------------------------------------------
✅ Language detected: javascript
✅ Issues found: 0
✅ Verification score: 100%
✅ All verification checks:
   ✅ hasReview
   ✅ hasIssues
   ✅ hasSuggestion
   ✅ hasFinal
   ✅ languageDetected

🎉 Agenticity test suite completed!
```

### Manual Testing with curl

```bash
curl -X POST http://localhost:8000/api/review \
  -H "Content-Type: application/json" \
  -d '{"code":"function hello(){ console.log(\"hi\") }"}'
```

## Advanced Features

### Retry Logic & Error Handling

The agent automatically retries failed API calls with intelligent backoff:

```
Attempt 1: Immediate
Attempt 2: ~1-2 seconds delay
Attempt 3: ~2-4 seconds delay
```

**Error Classification**:
- ✅ Retries on: Network errors, rate limits (429), server errors (5xx)
- ❌ No retry on: Invalid API key (401), bad request (4xx)

**Logging Example**:
```
[LLM] Retry 1/3 after 1247ms due to: rate limit exceeded
[reviewNode] latency: 3421ms | retries: 1 | tokens: in=450, out=230
```

### Schema Validation

All JSON outputs are validated against schemas:

**Issues Schema**:
```javascript
{
  issues: Array,
  each issue has: { title, severity, lines, explanation }
}
```

**Suggestion Schema**:
```javascript
{
  suggestion: String (non-empty)
}
```

**Final Schema**:
```javascript
{
  final: String (non-empty)
}
```

Failed validations log warnings but don't crash — the agent gracefully degrades to raw text output.

### Observability

The agent logs rich telemetry for every operation:

```
[LangGraph] Starting execution with nodes: review,issues,suggestion,reflect,verification,toolExecutor
[reviewNode] latency: 1823ms | retries: 0 | tokens: in=312, out=156
[issuesNode] Skipped (condition not met)
[verificationNode] Quality score: 80% (4/5 checks passed)
[toolExecutorNode] Suggested 1 tool(s): eslint (Reason: 3 style issues detected)
[LangGraph] Execution completed in 5234ms
```

## Production Notes

### Security

- **CORS**: Restrict origins to your frontend domain:
  ```javascript
  cors({ origin: 'https://your-domain.com' })
  ```
- **Authentication**: Add API key or OAuth to `/api/review`
- **Rate Limiting**: Implement `express-rate-limit` to prevent abuse:
  ```javascript
  rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })
  ```
- **Secrets**: Store `GROQ_API_KEY` in a secrets manager (AWS Secrets Manager, HashiCorp Vault) — **never commit to source control**

### Performance Optimization

- **Caching**: Cache language detection results for duplicate code snippets
- **Timeouts**: Set request timeouts (default: 30s) to prevent long-running requests
- **Load Balancing**: Run multiple agent instances behind a load balancer for high traffic

### Monitoring

Track these metrics in production:

| Metric | Purpose |
|--------|---------|
| `verificationScore` | Output quality trends |
| `criticalIssueCount` | Issue severity distribution |
| `retries` | API reliability |
| `latency` | Performance SLAs |
| `toolSuggestions` | Tool usage patterns |

### Scaling Considerations

- **Stateless Design**: Each review is independent — scales horizontally
- **Groq Rate Limits**: Monitor quota usage (~14,000 requests/day on free tier)
- **Memory**: Each request uses ~50-100MB (LLM context + processing)

## Roadmap

Future agenticity improvements (7/10 → 9/10):

- [ ] **Auto-execution of Safe Tools** — Automatically run formatters/linters with user consent
- [ ] **Multi-turn Refinement** — Agent iterates on low-quality outputs (< 60% score)
- [ ] **Git Integration** — Create branches, commit patches, open PRs automatically
- [ ] **Test Generation** — Auto-generate unit tests for issues found
- [ ] **Learning from Feedback** — Store user corrections to improve future reviews
- [ ] **Parallel Node Execution** — Run independent nodes concurrently
- [ ] **Custom Plugin System** — Allow users to define custom verification rules

## Contributing

Contributions welcome! Please read [AGENTICITY_IMPROVEMENTS.md](AGENTICITY_IMPROVEMENTS.md) to understand the system's autonomous design principles.

## License

MIT
