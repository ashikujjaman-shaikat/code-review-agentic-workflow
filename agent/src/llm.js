'use strict';

require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Sleep utility for retry backoff.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send a chat-completion request to the Groq API with retry logic and exponential backoff.
 * This increases agent autonomy by handling transient failures automatically.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} [opts]
 * @param {string}  [opts.model]
 * @param {number}  [opts.maxTokens=800]
 * @param {number}  [opts.temperature=0]
 * @param {number}  [opts.maxRetries=3]
 * @returns {Promise<{text: string, usage: object|null, retries: number}>}
 */
async function chatCompletion(messages, { model, maxTokens = 800, temperature = 0, maxRetries = MAX_RETRIES } = {}) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: model || DEFAULT_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
      });
      
      return {
        text: completion.choices[0]?.message?.content ?? '',
        usage: completion.usage ?? null,
        retries: attempt,
      };
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (400-level)
      if (error?.status && error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      // If this was the last attempt, throw
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * backoffMs;
      const waitTime = backoffMs + jitter;
      
      console.warn(`[LLM] Retry ${attempt + 1}/${maxRetries} after ${Math.round(waitTime)}ms due to: ${error?.message || 'unknown error'}`);
      await sleep(waitTime);
    }
  }
  
  throw lastError;
}

/**
 * Attempt to extract and parse the first JSON object or array from text.
 * Validates against an optional schema for increased reliability.
 *
 * @param {string} text
 * @param {object} [schema] - Optional schema validator { validate: (obj) => boolean }
 * @returns {object|Array|null}
 */
function safeParseJson(text, schema) {
  if (!text) return null;

  // Try direct parse first (model may return a clean JSON string)
  try {
    const parsed = JSON.parse(text);
    if (schema && !schema.validate(parsed)) {
      console.warn('[safeParseJson] Parsed JSON failed schema validation');
      return null;
    }
    return parsed;
  } catch (_) { /* fall through */ }

  // Extract the first {...} or [...] block and try again
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (schema && !schema.validate(parsed)) {
      console.warn('[safeParseJson] Extracted JSON failed schema validation');
      return null;
    }
    return parsed;
  } catch (_) {
    return null;
  }
}

/**
 * Simple schema validators for common response types.
 * These enable the agent to validate its own outputs autonomously.
 */
const schemas = {
  issues: {
    validate: (obj) => obj && Array.isArray(obj.issues) && obj.issues.every(
      i => i.title && i.severity && i.explanation
    ),
  },
  suggestion: {
    validate: (obj) => obj && typeof obj === 'object' && 
      (obj.suggestion || obj.fixes || obj.patch || obj.code || obj.fixed_code),
  },
  final: {
    validate: (obj) => obj && typeof obj.final === 'string' && obj.final.length > 0,
  },
};

module.exports = { chatCompletion, safeParseJson, schemas };
