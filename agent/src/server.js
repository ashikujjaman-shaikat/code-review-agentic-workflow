'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { runCodeReview } = require('./agent');

const app = express();
const PORT = process.env.PORT || 8000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// ─── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

async function handleReview(req, res) {
  const { code } = req.body;

  if (!code || typeof code !== 'string' || code.trim().length < 5) {
    return res.status(400).json({ error: 'Code payload is too small' });
  }

  try {
    const result = await runCodeReview(code);
    return res.json(result);
  } catch (err) {
    console.error('[agent] review error:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Internal agent error' });
  }
}


// Frontend-facing route to handle code review requests
app.post('/api/review', handleReview);

// ─── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () =>
  console.log(`[agent] Code Review Agent (Node.js + Groq) listening on port ${PORT}`)
);
