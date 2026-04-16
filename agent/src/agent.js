'use strict';

const { chatCompletion, safeParseJson, schemas } = require('./llm');

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

  /**
   * Add a node with optional conditional execution.
   * Increases agenticity by allowing the agent to decide execution paths.
   * 
   * @param {Function} fn - Node function to execute
   * @param {Function} [condition] - Optional condition (state) => boolean
   */
  addNode(fn, condition = null) {
    this.nodes.push({ fn, condition });
    return this; // fluent
  }

  /**
   * Run the graph with conditional branching support.
   * Nodes can be skipped based on runtime state evaluation.
   */
  async run() {
    for (const { fn, condition } of this.nodes) {
      // Conditional execution: agent decides whether to run this node
      if (condition && !condition(this.state)) {
        console.log(`[LangGraph] Skipping node ${fn.name} (condition not met)`);
        continue;
      }
      
      await fn(this.state);
      
      // Check if state indicates early termination
      if (this.state.shouldTerminate) {
        console.log(`[LangGraph] Early termination requested by ${fn.name}`);
        break;
      }
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
  const { text: res, usage, retries } = await chatCompletion(messages, { maxTokens: 600 });
  console.log(`[reviewNode]     latency: ${Date.now() - t0}ms | retries: ${retries} | prompt: ${usage?.prompt_tokens ?? '?'} | completion: ${usage?.completion_tokens ?? '?'} | total: ${usage?.total_tokens ?? '?'} tokens`);
  state.review = res.trim();
  if (!isText) {
    state.language = detectLanguage(state.code);
  }
}

/**
 * Node 2 — structured issue extraction with schema validation
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
  const { text: res, usage, retries } = await chatCompletion(messages, { maxTokens: 900 });
  console.log(`[issuesNode]     latency: ${Date.now() - t0}ms | retries: ${retries} | prompt: ${usage?.prompt_tokens ?? '?'} | completion: ${usage?.completion_tokens ?? '?'} | total: ${usage?.total_tokens ?? '?'} tokens`);
  
  // Use schema validation for increased reliability
  const parsed = safeParseJson(res, schemas.issues);

  if (parsed && Array.isArray(parsed.issues)) {
    state.issues = parsed.issues;
    // Agent decision: count critical issues for conditional branching
    state.criticalIssueCount = parsed.issues.filter(i => 
      (i.severity || '').toLowerCase() === 'high' || 
      (i.severity || '').toLowerCase() === 'critical'
    ).length;
  } else {
    console.warn('[issuesNode] Failed schema validation, using fallback');
    state.issues = [{ title: 'Unstructured issues', severity: 'medium', explanation: res || 'No issues returned' }];
    state.criticalIssueCount = 0;
  }
}

/**
 * Node 3 — actionable suggestions + optional patch with schema validation
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
  const { text: res, usage, retries } = await chatCompletion(messages, { maxTokens: 1200 });
  console.log(`[suggestionNode] latency: ${Date.now() - t0}ms | retries: ${retries} | prompt: ${usage?.prompt_tokens ?? '?'} | completion: ${usage?.completion_tokens ?? '?'} | total: ${usage?.total_tokens ?? '?'} tokens`);
  
  const parsed = safeParseJson(res, schemas.suggestion);

  if (parsed && typeof parsed === 'object') {
    let suggestion = (parsed.suggestion || parsed.fixes || '').trim() || res.slice(0, 2000);
    const patch = parsed.patch || parsed.code || parsed.fixed_code || '';
    state.suggestion = patch ? `${suggestion}\n\n${patch}`.trim() : suggestion;
  } else {
    console.warn('[suggestionNode] Failed schema validation, using raw output');
    state.suggestion = res.trim();
  }
}

/**
 * Node 4 — reflective final summary with schema validation
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
  const { text: res, usage, retries } = await chatCompletion(messages, { maxTokens: 800 });
  console.log(`[reflectNode]    latency: ${Date.now() - t0}ms | retries: ${retries} | prompt: ${usage?.prompt_tokens ?? '?'} | completion: ${usage?.completion_tokens ?? '?'} | total: ${usage?.total_tokens ?? '?'} tokens`);
  
  const parsed = safeParseJson(res, schemas.final);

  if (parsed && typeof parsed.final === 'string') {
    state.final = parsed.final.trim();
  } else {
    console.warn('[reflectNode] Failed schema validation, using raw output');
    state.final = res.trim();
  }
}

/**
 * Node 5 — Self-verification node (AGENTIC IMPROVEMENT)
 * The agent validates its own outputs and flags quality issues autonomously.
 */
async function verificationNode(state) {
  console.log('[verificationNode] Running self-verification checks...');
  
  const checks = {
    hasReview: !!state.review && state.review.length > 50,
    hasIssues: Array.isArray(state.issues) && state.issues.length > 0,
    hasSuggestion: !!state.suggestion && state.suggestion.length > 20,
    hasFinal: !!state.final && state.final.length > 50,
    issuesWellFormed: state.issues.every(i => i.title && i.severity && i.explanation),
  };
  
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  
  state.verificationScore = passed / total;
  state.verificationChecks = checks;
  
  console.log(`[verificationNode] Quality score: ${(state.verificationScore * 100).toFixed(0)}% (${passed}/${total} checks passed)`);
  
  // Agent decision: flag low-quality outputs
  if (state.verificationScore < 0.6) {
    console.warn('[verificationNode] WARNING: Output quality below threshold');
    state.qualityWarning = 'Some review components may be incomplete or low-quality';
  }
}

/**
 * Node 6 — Tool executor framework (AGENTIC IMPROVEMENT SCAFFOLD)
 * Enables the agent to execute external tools/actions autonomously.
 * Currently a scaffold - ready for git, file, test, or API integrations.
 */
async function toolExecutorNode(state) {
  // Check if any tools are requested based on detected issues
  const toolActions = [];
  
  // Example: if critical security issues found, suggest running security scan
  if (state.criticalIssueCount > 0) {
    toolActions.push({
      tool: 'security-scan',
      reason: `${state.criticalIssueCount} critical issue(s) detected`,
      command: 'npm audit', // Example
      autoExecute: false, // Requires user confirmation
    });
  }
  
  // Example: if code formatting issues, suggest running formatter
  const hasFormattingIssues = state.issues.some(i => 
    i.title.toLowerCase().includes('format') || 
    i.title.toLowerCase().includes('style')
  );
  
  if (hasFormattingIssues) {
    toolActions.push({
      tool: 'code-formatter',
      reason: 'Formatting/style issues detected',
      command: 'npm run format', // Example
      autoExecute: false,
    });
  }
  
  state.suggestedTools = toolActions;
  
  if (toolActions.length > 0) {
    console.log(`[toolExecutorNode] Suggested ${toolActions.length} tool action(s):`, toolActions.map(t => t.tool).join(', '));
  } else {
    console.log('[toolExecutorNode] No automated tools suggested');
  }
  
  // Future: Add actual tool execution logic here
  // e.g., run git commands, file operations, test runners, etc.
}

// ─── Factory ────────────────────────────────────────────────────────────────────

/**
 * Build and run the full code-review graph for the given code snippet.
 * NOW WITH ENHANCED AGENTICITY:
 * - Conditional branching based on runtime state
 * - Self-verification of outputs
 * - Tool execution suggestions
 * - Retry/resilience in LLM calls
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
    criticalIssueCount: 0,
    verificationScore: 0,
    verificationChecks: {},
    suggestedTools: [],
    shouldTerminate: false,
  };

  const plainText = isPlainText(code);
  state.language = plainText ? 'plaintext' : null;

  // Build graph with conditional execution (AGENTIC IMPROVEMENT)
  const graph = new LangGraph(state).addNode(reviewNode);
  
  if (!plainText) {
    graph
      .addNode(issuesNode)
      .addNode(suggestionNode)
      .addNode(reflectNode)
      // AGENTIC IMPROVEMENTS: Add verification and tool executor
      .addNode(verificationNode)
      .addNode(toolExecutorNode, (s) => s.criticalIssueCount > 0 || s.issues.length > 3); // Conditional: only run if significant issues
  }

  await graph.run();
  return state;
}

module.exports = { 
  LangGraph, 
  runCodeReview, 
  isPlainText, 
  reviewNode, 
  issuesNode, 
  suggestionNode, 
  reflectNode,
  verificationNode,
  toolExecutorNode,
};
