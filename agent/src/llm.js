'use strict';

require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

/**
 * Send a chat-completion request to the Groq API.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} [opts]
 * @param {string}  [opts.model]
 * @param {number}  [opts.maxTokens=800]
 * @param {number}  [opts.temperature=0]
 * @returns {Promise<string>} the assistant's reply text
 */
async function chatCompletion(messages, { model, maxTokens = 800, temperature = 0 } = {}) {
  const completion = await groq.chat.completions.create({
    model: model || DEFAULT_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature,
  });
  return completion.choices[0]?.message?.content ?? '';
}

/**
 * Attempt to extract and parse the first JSON object or array from text.
 *
 * @param {string} text
 * @returns {object|Array|null}
 */
function safeParseJson(text) {
  if (!text) return null;

  // Try direct parse first (model may return a clean JSON string)
  try {
    return JSON.parse(text);
  } catch (_) { /* fall through */ }

  // Extract the first {...} or [...] block and try again
  const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch (_) {
    return null;
  }
}

module.exports = { chatCompletion, safeParseJson };
