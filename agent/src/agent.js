'use strict';

const { chatCompletion, safeParseJson } = require('./llm');

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior MERN stack engineer.
Analyze code deeply.
Focus on:
* bugs
* performance
* security
* readability
Return clear structured output.`;

// ─── Mini LangGraph-style orchestrator ─────────────────────────────────────────

class LangGraph {
  constructor(state) {
    this.state = state;
    this.nodes = [];
  }

  addNode(fn) {
    this.nodes.push(fn);
    return this; // fluent
  }

  async run() {
    for (const node of this.nodes) {
      await node(this.state);
    }
  }
}

// ─── Language detection helper ─────────────────────────────────────────────────

function detectLanguage(code) {
  const lc = code.toLowerCase();
  if (/import\s+react|from\s+['"]react['"]|useeffect\s*\(|usestate\s*\(|\.jsx/.test(lc)) return 'react';
  if (/require\s*\(\s*['"]express['"]|module\.exports|app\.get\(|app\.post\(/.test(lc)) return 'node';
  if (/^\s*def\s+\w+|import\s+\w+|from\s+\w+\s+import/.test(code)) return 'python';
  return 'unknown';
}

// ─── Nodes ──────────────────────────────────────────────────────────────────────

/**
 * Node 1 — high-level review paragraph
 */
async function reviewNode(state) {
  const prompt =
    'Provide a concise senior MERN developer review of the following code.\n\n' +
    'Deliverable: one concise paragraph summary, focusing on architecture, clarity, and any red flags.\n\n' +
    `Code:\n${state.code}\n\n`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];

  const res = await chatCompletion(messages, { maxTokens: 600 });
  state.review = res.trim();
  state.language = detectLanguage(state.code);
}

/**
 * Node 2 — structured issue extraction
 */
async function issuesNode(state) {
  const prompt =
    'From the provided code and previous review, extract up to 10 issues.\n' +
    'Return ONLY valid JSON of the form:\n' +
    '{\n  "issues": [\n    {"title": ..., "severity": "low|medium|high", "lines": "optional", "explanation": ...}\n  ]\n}\n\n' +
    `Code:\n${state.code}\n\nReview:\n${state.review}\n`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];

  const res = await chatCompletion(messages, { maxTokens: 900 });
  const parsed = safeParseJson(res);

  if (parsed && Array.isArray(parsed.issues)) {
    state.issues = parsed.issues;
  } else {
    state.issues = [{ title: 'Unstructured issues', severity: 'medium', explanation: res || 'No issues returned' }];
  }
}

/**
 * Node 3 — actionable suggestions + optional patch
 */
async function suggestionNode(state) {
  const prompt =
    'Provide an actionable set of suggestions and, where helpful, a small improved code snippet or patch.\n' +
    'Return ONLY valid JSON of the form:\n' +
    '{\n  "suggestion": "concise text",\n  "patch": "code or diff as string (optional)"\n}\n\n' +
    `Code:\n${state.code}\n\nIssues:\n${JSON.stringify(state.issues, null, 2)}\n\n`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];

  const res = await chatCompletion(messages, { maxTokens: 1200 });
  const parsed = safeParseJson(res);

  if (parsed && typeof parsed === 'object') {
    let suggestion = (parsed.suggestion || parsed.fixes || '').trim() || res.slice(0, 2000);
    const patch = parsed.patch || parsed.code || parsed.fixed_code || '';
    state.suggestion = patch ? `${suggestion}\n\n${patch}`.trim() : suggestion;
  } else {
    state.suggestion = res.trim();
  }
}

/**
 * Node 4 — reflective final summary
 */
async function reflectNode(state) {
  const prompt =
    'Reflect on the review, issues, and suggestions. Produce a concise final output that a developer can action immediately.\n' +
    'Return ONLY valid JSON: { "final": "final actionable summary (max 300 words)" }\n\n' +
    `Review:\n${state.review}\n\nIssues:\n${JSON.stringify(state.issues, null, 2)}\n\nSuggestions:\n${state.suggestion}\n\n`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];

  const res = await chatCompletion(messages, { maxTokens: 800 });
  const parsed = safeParseJson(res);

  if (parsed && typeof parsed.final === 'string') {
    state.final = parsed.final.trim();
  } else {
    state.final = res.trim();
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────────

/**
 * Build and run the full code-review graph for the given code snippet.
 *
 * @param {string} code
 * @returns {Promise<CodeReviewState>}
 */
async function runCodeReview(code) {
  /** @type {CodeReviewState} */
  const state = {
    code,
    language: null,
    review: '',
    issues: [],
    suggestion: '',
    final: '',
  };

  const graph = new LangGraph(state)
    .addNode(reviewNode)
    .addNode(issuesNode)
    .addNode(suggestionNode)
    .addNode(reflectNode);

  await graph.run();
  return state;
}

module.exports = { LangGraph, runCodeReview, reviewNode, issuesNode, suggestionNode, reflectNode };
