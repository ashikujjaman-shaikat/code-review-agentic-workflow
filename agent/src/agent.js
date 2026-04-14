'use strict';

const { chatCompletion, safeParseJson } = require('./llm');

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior polyglot software engineer with deep expertise across all major programming languages and frameworks including JavaScript, TypeScript, Python, Java, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, Dart, and platforms such as React, Angular, Vue, Svelte, Node.js, Express, Django, Flask, FastAPI, Spring Boot, ASP.NET, Laravel, Ruby on Rails, and DevOps tooling like Docker, Kubernetes, GitHub Actions, and Terraform.
Analyze code deeply.
Focus on:
* bugs
* performance
* security
* readability
* idiomatic usage for the detected language / framework
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

  // React / JSX
  if (/import\s+react|from\s+['"]react['"]|useeffect\s*\(|usestate\s*\(|usememo\s*\(|jsx|tsx/.test(lc)) return 'react';

  // Vue
  if (/<template[\s>]|<script\s+setup|definecomponent\s*\(|defineprop/.test(lc)) return 'vue';

  // Angular
  if (/@component\s*\(|@injectable\s*\(|@ngmodule\s*\(|observable</.test(lc)) return 'angular';

  // Svelte
  if (/<script>\s*\n[\s\S]*<\/script>\s*\n[\s\S]*<style>/.test(lc)) return 'svelte';

  // TypeScript (check before generic JS)
  if (/:\s*(string|number|boolean|void|never|any|unknown)\b|interface\s+\w+\s*\{|type\s+\w+\s*=|<t>|as\s+\w+|import\s+type\b/.test(lc)) return 'typescript';

  // Node.js / Express
  if (/require\s*\(\s*['"]express['"]|module\.exports|app\.(get|post|put|delete|use)\s*\(/.test(lc)) return 'node';

  // General JavaScript
  if (/const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|=>\s*\{|document\.getelementbyid/.test(lc)) return 'javascript';

  // Python
  if (/^\s*def\s+\w+|import\s+\w+|from\s+\w+\s+import|print\s*\(|__name__\s*==/.test(code)) return 'python';

  // Java
  if (/public\s+(class|static|void|interface)|system\.out\.(print|println)|@override|import\s+java\./.test(lc)) return 'java';

  // C#
  if (/using\s+system|namespace\s+\w+|public\s+class\s+\w+.*:\s*\w+|console\.writeline/.test(lc)) return 'csharp';

  // Go
  if (/package\s+main|func\s+\w+\s*\(|import\s+"fmt"|:=\s*/.test(lc)) return 'go';

  // Rust
  if (/fn\s+\w+\s*\(|let\s+(mut\s+)?\w+\s*:|println!\s*\(|use\s+std::|impl\s+\w+/.test(lc)) return 'rust';

  // PHP
  if (/<\?php|\$\w+\s*=|echo\s+|function\s+\w+\s*\(/.test(lc)) return 'php';

  // Ruby
  if (/require\s+['"]|def\s+\w+\n|puts\s+|class\s+\w+\s*<|end\s*$/.test(lc)) return 'ruby';

  // Swift
  if (/import\s+foundation|import\s+uikit|var\s+\w+\s*:\s*\w+|func\s+\w+\s*\(\s*_\s+/.test(lc)) return 'swift';

  // Kotlin
  if (/fun\s+\w+\s*\(|val\s+\w+\s*:|data\s+class\s+\w+|companion\s+object/.test(lc)) return 'kotlin';

  // Dart / Flutter
  if (/void\s+main\s*\(\s*\)|widget\s+build\s*\(|statelesswidget|statefulwidget/.test(lc)) return 'dart';

  // SQL
  if (/\bselect\b.+\bfrom\b|\binsert\s+into\b|\bcreate\s+table\b|\balter\s+table\b/i.test(code)) return 'sql';

  // Shell / Bash
  if (/#!\/bin\/(bash|sh)|echo\s+|chmod\s+|\$\{\w+\}|\$\(\w+/.test(lc)) return 'bash';

  // Docker
  if (/^from\s+\w+|^run\s+|^copy\s+|^expose\s+|^cmd\s+/m.test(lc)) return 'docker';

  // Kubernetes / YAML
  if (/apiVersion:\s+|kind:\s+(deployment|service|pod|ingress|configmap)/i.test(code)) return 'kubernetes';

  // HTML
  if (/<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]/.test(lc)) return 'html';

  // CSS / SCSS
  if (/\{\s*[\w-]+\s*:\s*[^}]+;\s*\}|@media\s+|@import\s+|@keyframes\s+/.test(lc)) return 'css';

  // GraphQL
  if (/^type\s+\w+\s*\{|^query\s+\w+|^mutation\s+\w+|^schema\s*\{/m.test(lc)) return 'graphql';

  // C / C++
  if (/#include\s*<|int\s+main\s*\(|printf\s*\(|std::|cout\s*<</.test(lc)) return 'cpp';

  return 'unknown';
}
/**
 * Returns true when the input looks like natural-language prose rather than code.
 */
function isPlainText(input) {
  const codePatterns = [
    /[{}\[\]();]/, // brackets / semicolons
    /\b(function|class|const|let|var|return|import|export|require|def|if|else|for|while|switch|=>)\b/,
    /[=<>!&|]{2}/, // ==, !=, <=, >=, &&, ||, =>
    /\/\/|\*\*|\.prototype\.|#include|<\/\w+>/, // comments, operators, HTML tags
  ];
  return !codePatterns.some((re) => re.test(input));
}
// ─── Nodes ──────────────────────────────────────────────────────────────────────

/**
 * Node 1 — high-level review paragraph
 */
async function reviewNode(state) {
  const isText = state.language === 'plaintext';
  const prompt = isText
    ? 'The following input is plain text, not code. Briefly acknowledge it and let the user know this tool expects a code snippet to review.\n\n' +
      `Input:\n${state.code}\n\n`
    : 'Provide a concise senior engineer review of the following code. Identify the language and framework automatically.\n\n' +
      'Deliverable: one concise paragraph summary, focusing on architecture, idiomatic style for the detected stack, clarity, and any red flags.\n\n' +
      `Code:\n${state.code}\n\n`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];

  const t0 = Date.now();
  const { text: res, usage } = await chatCompletion(messages, { maxTokens: 600 });
  console.log(`[reviewNode]     latency: ${Date.now() - t0}ms | prompt: ${usage?.prompt_tokens ?? '?'} | completion: ${usage?.completion_tokens ?? '?'} | total: ${usage?.total_tokens ?? '?'} tokens`);
  state.review = res.trim();
  if (!isText) {
    state.language = detectLanguage(state.code);
  }
}

/**
 * Node 2 — structured issue extraction
 */
async function issuesNode(state) {
  const prompt =
    'From the provided code and previous review, extract up to 10 issues. Consider language-specific best practices, security vulnerabilities (OWASP Top 10 where applicable), performance anti-patterns, and idiomatic style violations for the detected stack.\n' +
    'Return ONLY valid JSON of the form:\n' +
    '{\n  "issues": [\n    {"title": ..., "severity": "low|medium|high", "lines": "optional", "explanation": ...}\n  ]\n}\n\n' +
    `Code:\n${state.code}\n\nReview:\n${state.review}\n`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];

  const t0 = Date.now();
  const { text: res, usage } = await chatCompletion(messages, { maxTokens: 900 });
  console.log(`[issuesNode]     latency: ${Date.now() - t0}ms | prompt: ${usage?.prompt_tokens ?? '?'} | completion: ${usage?.completion_tokens ?? '?'} | total: ${usage?.total_tokens ?? '?'} tokens`);
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
    'Provide an actionable set of suggestions for the detected language/framework and, where helpful, a small improved code snippet or patch demonstrating the fix.\n' +
    'Return ONLY valid JSON of the form:\n' +
    '{\n  "suggestion": "concise text",\n  "patch": "code or diff as string (optional)"\n}\n\n' +
    `Code:\n${state.code}\n\nIssues:\n${JSON.stringify(state.issues, null, 2)}\n\n`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];

  const t0 = Date.now();
  const { text: res, usage } = await chatCompletion(messages, { maxTokens: 1200 });
  console.log(`[suggestionNode] latency: ${Date.now() - t0}ms | prompt: ${usage?.prompt_tokens ?? '?'} | completion: ${usage?.completion_tokens ?? '?'} | total: ${usage?.total_tokens ?? '?'} tokens`);
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

  const t0 = Date.now();
  const { text: res, usage } = await chatCompletion(messages, { maxTokens: 800 });
  console.log(`[reflectNode]    latency: ${Date.now() - t0}ms | prompt: ${usage?.prompt_tokens ?? '?'} | completion: ${usage?.completion_tokens ?? '?'} | total: ${usage?.total_tokens ?? '?'} tokens`);
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

  const plainText = isPlainText(code);
  state.language = plainText ? 'plaintext' : null;

  const graph = new LangGraph(state).addNode(reviewNode);
  if (!plainText) {
    graph
      .addNode(issuesNode)
      .addNode(suggestionNode)
      .addNode(reflectNode);
  }

  await graph.run();
  return state;
}

module.exports = { LangGraph, runCodeReview, isPlainText, reviewNode, issuesNode, suggestionNode, reflectNode };
