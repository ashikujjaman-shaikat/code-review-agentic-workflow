import React, { useState } from 'react'
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs/components/prism-core'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-markup-templating'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-dart'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-docker'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-graphql'
import 'prismjs/components/prism-css'
import 'prismjs/themes/prism.css'
import { submitCode } from './api'

// Map backend language names → PrismJS language objects
const PRISM_MAP = {
  react: languages.jsx,
  vue: languages.markup,
  angular: languages.typescript,
  svelte: languages.markup,
  typescript: languages.typescript,
  node: languages.javascript,
  javascript: languages.javascript,
  python: languages.python,
  java: languages.java,
  csharp: languages.csharp,
  go: languages.go,
  rust: languages.rust,
  php: languages.php,
  ruby: languages.ruby,
  swift: languages.swift,
  kotlin: languages.kotlin,
  dart: languages.dart,
  sql: languages.sql,
  bash: languages.bash,
  docker: languages.docker,
  kubernetes: languages.yaml,
  html: languages.markup,
  css: languages.css,
  graphql: languages.graphql,
  cpp: languages.clike,
}

const LANG_LABELS = {
  react: 'React / JSX',
  vue: 'Vue',
  angular: 'Angular / TypeScript',
  svelte: 'Svelte',
  typescript: 'TypeScript',
  node: 'Node.js / Express',
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby',
  swift: 'Swift',
  kotlin: 'Kotlin',
  dart: 'Dart / Flutter',
  sql: 'SQL',
  bash: 'Bash / Shell',
  docker: 'Dockerfile',
  kubernetes: 'Kubernetes / YAML',
  html: 'HTML',
  css: 'CSS / SCSS',
  graphql: 'GraphQL',
  cpp: 'C / C++',
  unknown: 'Unknown',
  plaintext: 'Plain Text',
}

function getPrismLang(lang) {
  return PRISM_MAP[lang] || languages.javascript
}

// Normalise severity string to a CSS class key
function sevClass(s) {
  const v = (s || '').toLowerCase().trim()
  if (v === 'critical') return 'critical'
  if (v === 'high') return 'high'
  if (v === 'medium' || v === 'moderate') return 'medium'
  if (v === 'low') return 'low'
  return 'info'
}

// Split a text blob into <p> elements (blank-line-separated paragraphs)
function Prose({ text, className }) {
  if (!text) return null
  const paras = text.split(/\n{2,}/).map(p => p.replace(/\n/g, ' ').trim()).filter(Boolean)
  return (
    <div className={className}>
      {paras.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  )
}

// Strip markdown code fences (```json ... ``` or ``` ... ```) from a string
function stripCodeFence(s) {
  return s.replace(/^```[^\n]*\n?([\s\S]*?)```\s*$/m, '$1').trim()
}

// Try to parse a value as JSON; returns parsed object or null
// Handles values wrapped in markdown code fences
function tryParseJson(val) {
  if (!val) return null
  if (typeof val === 'object') return val
  const s = String(val).trim()
  const attempts = [s, stripCodeFence(s)]
  for (const attempt of attempts) {
    try { return JSON.parse(attempt) } catch { /* continue */ }
  }
  return null
}

// Normalize raw suggestion into { text, patch }
function normalizeSuggestion(raw) {
  // First try to parse as JSON (handles fenced JSON blocks too)
  const parsed = tryParseJson(raw)
  if (parsed && typeof parsed === 'object') {
    return {
      text: (parsed.suggestion || parsed.fixes || '').trim(),
      patch: (parsed.patch || parsed.code || parsed.fixed_code || '').trim(),
    }
  }
  // De-fence a plain code fence that wraps everything
  const s = stripCodeFence(String(raw || '').trim())
  // If it still starts with { try one more JSON parse of the de-fenced value
  if (s.startsWith('{')) {
    const p2 = tryParseJson(s)
    if (p2 && typeof p2 === 'object') {
      return {
        text: (p2.suggestion || p2.fixes || '').trim(),
        patch: (p2.patch || p2.code || p2.fixed_code || '').trim(),
      }
    }
    // Regex fallback: extract "suggestion" and "patch" even when JSON.parse fails
    const mText = s.match(/"(?:suggestion|fixes)"\s*:\s*"([\s\S]*?)"(?:\s*,|\s*\})/)
    const mPatch = s.match(/"(?:patch|code|fixed_code)"\s*:\s*"([\s\S]*?)"(?:\s*,|\s*\})/)
    if (mText || mPatch) {
      const unescape = v => v.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t').trim()
      return {
        text: mText ? unescape(mText[1]) : '',
        patch: mPatch ? unescape(mPatch[1]) : '',
      }
    }
  }
  // Plain string: split text from an embedded code block
  const nlIdx = s.indexOf('\n\n')
  if (nlIdx !== -1) {
    const before = s.slice(0, nlIdx).trim()
    const after = s.slice(nlIdx + 2).trim()
    if (after && /[{};()]/.test(after)) return { text: before, patch: stripCodeFence(after) }
  }
  return { text: s, patch: '' }
}

// Normalize final summary string (handles { "final": "..." } JSON strings)
function normalizeFinal(raw) {
  if (!raw) return ''
  const parsed = tryParseJson(raw)
  if (parsed && typeof parsed === 'object') return (parsed.final || '').trim()
  const s = stripCodeFence(String(raw).trim())
  // Regex fallback: extract "final" value even when JSON parsing fails
  const m = s.match(/"final"\s*:\s*"([\s\S]*?)"\s*\}?\s*$/)
  if (m) return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim()
  return s
}

// Render inline text with backtick code spans highlighted
function InlineText({ text }) {
  const parts = text.split(/`([^`]+)`/)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <code key={i} className="inline-code">{p}</code> : p
      )}
    </>
  )
}

// Render final summary: splits numbered list items out of a prose blob
function FinalProse({ text, className }) {
  if (!text) return null

  // Split the blob into segments: numbered items vs plain paragraphs
  // Matches "1. ...", "2. ..." etc. (possibly mid-sentence after a space)
  const segments = []
  const listItemRe = /(?:^|\s)(\d+)\.\s+/g
  let last = 0
  let m
  while ((m = listItemRe.exec(text)) !== null) {
    const start = m.index + (m[0].startsWith(' ') ? 1 : 0)
    if (start > last) segments.push({ type: 'prose', text: text.slice(last, start).trim() })
    // find where this item ends (next numbered item or end of string)
    const nextMatch = /(?:^|\s)\d+\.\s+/g
    nextMatch.lastIndex = m.index + m[0].length
    const next = nextMatch.exec(text)
    const end = next ? next.index + (next[0].startsWith(' ') ? 1 : 0) : text.length
    segments.push({ type: 'item', num: m[1], text: text.slice(m.index + m[0].length, end).trim() })
    last = end
  }
  if (last < text.length) segments.push({ type: 'prose', text: text.slice(last).trim() })

  // Group consecutive list items
  const blocks = []
  let listBuf = []
  for (const seg of segments) {
    if (seg.type === 'item') {
      listBuf.push(seg)
    } else {
      if (listBuf.length) { blocks.push({ type: 'list', items: listBuf }); listBuf = [] }
      if (seg.text) blocks.push(seg)
    }
  }
  if (listBuf.length) blocks.push({ type: 'list', items: listBuf })

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.type === 'list') {
          return (
            <ol key={i} className="final-list">
              {block.items.map((it, j) => (
                <li key={j}><InlineText text={it.text} /></li>
              ))}
            </ol>
          )
        }
        return block.text.split(/\n{2,}/).map((p, j) => (
          <p key={`${i}-${j}`}><InlineText text={p.replace(/\n/g, ' ').trim()} /></p>
        ))
      })}
    </div>
  )
}

// Detect code blocks inside suggestion patch — optionally strip markdown fences
function PatchBlock({ code }) {
  if (!code) return null
  const clean = code.replace(/^```[^\n]*\n?/, '').replace(/```$/, '').trim()
  const [patchCopied, setPatchCopied] = React.useState(false)
  const handleCopyPatch = () => {
    navigator.clipboard.writeText(clean).then(() => {
      setPatchCopied(true)
      setTimeout(() => setPatchCopied(false), 1800)
    }).catch(() => {})
  }
  return (
    <div className="patch-block">
      <div className="patch-header">
        <span className="patch-label">Suggested patch</span>
        <button type="button" className="btn-copy patch-copy-btn" onClick={handleCopyPatch}>
          {patchCopied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="suggestion-code">{clean}</pre>
    </div>
  )
}

function SuggestionBody({ data }) {
  const { text, patch } = normalizeSuggestion(data)
  if (!text && !patch) return null
  return (
    <div className="suggestion-block">
      {text && <FinalProse text={text} className="suggestion-text" />}
      <PatchBlock code={patch} />
    </div>
  )
}

function SeverityPill({ severity }) {
  const cls = sevClass(severity)
  return <span className={`sev-pill ${cls}`}>{severity || 'info'}</span>
}

export default function App() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [editorLang, setEditorLang] = useState('javascript')
  const [copied, setCopied] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    const trimmed = (code || '').trim()
    if (!trimmed) {
      setError('Please paste some code to review.')
      return
    }
    setLoading(true)
    try {
      const resp = await submitCode(trimmed)
      setResult(resp.data)
      if (resp.data?.language) setEditorLang(resp.data.language)
    } catch (err) {
      const status = err?.response?.status
      if (status === 500) {
        setError('Server error — the review could not be completed. Please try again.')
      } else {
        setError(err?.response?.data?.error || err.message || 'Unknown error')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const isPlaintext = result?.language === 'plaintext'
  const issues = Array.isArray(result?.issues) ? result.issues : []

  // Severity summary counts
  const sevCounts = issues.reduce((acc, it) => {
    const k = sevClass(it.severity)
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

  return (
    <div className="container">
      <header className="site-header">
        <h1>
          <span className="header-icon">⚡</span>
          Code Reviewer
        </h1>
        <p>
          AI-powered review for all major stacks — React, Vue, TypeScript, Python, Java, Go, Rust, PHP, Ruby, Swift, SQL, Bash, Docker, and more.
        </p>
      </header>

      <form className="form-card" onSubmit={onSubmit}>
        <label className="form-label">Paste code to review</label>
        <div className="editor-wrapper">
          {!code && (
            <span className="editor-placeholder">Paste code here — any language or framework…</span>
          )}
          <Editor
            value={code}
            onValueChange={setCode}
            highlight={(c) => highlight(c, getPrismLang(editorLang), editorLang)}
            padding={16}
            style={{
              fontFamily: "'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 13.5,
              lineHeight: 1.6,
              minHeight: '260px',
            }}
          />
          <div className="editor-footer">
            <span className="editor-meta">
              {code ? `${code.split('\n').length} lines · ${code.length} chars` : 'Start typing or paste code…'}
            </span>
            <button type="button" className="btn-copy" onClick={handleCopy} disabled={!code}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="submit-row">
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" />
                Analysing…
              </>
            ) : (
              '⚡ Review Code'
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="results">
          {/* Meta bar */}
          <div className="result-meta-bar">
            {result.language && (
              <span className="lang-badge">
                🔍 Detected: <strong>{LANG_LABELS[result.language] || result.language}</strong>
              </span>
            )}
            {!isPlaintext && issues.length > 0 && (
              <span className="issue-count-badge">
                {issues.length} issue{issues.length !== 1 ? 's' : ''} found
                {Object.entries(sevCounts).map(([k, n]) => (
                  <SeverityPill key={k} severity={k} />
                ))}
              </span>
            )}
          </div>

          {/* Review */}
          <div className="result-card">
            <div className="result-card-header">
              <h3>
                <span>📋</span>
                {isPlaintext ? 'Analysis' : 'Review'}
              </h3>
            </div>
            <div className="result-card-body">
              <Prose text={result.review} className="review-prose" />
            </div>
          </div>

          {/* Issues */}
          {!isPlaintext && issues.length > 0 && (
            <div className="result-card">
              <div className="result-card-header">
                <h3><span>🐛</span> Issues</h3>
                <span className="muted">{issues.length} found</span>
              </div>
              <div className="result-card-body">
                <ul className="issues-list">
                  {issues.map((it, i) => {
                    const sc = sevClass(it.severity)
                    return (
                      <li key={i} className={`issue-card ${sc}`}>
                        <div className="issue-card-head">
                          <span className="issue-title">{it.title || it[0] || `Issue ${i + 1}`}</span>
                          <SeverityPill severity={it.severity || 'info'} />
                        </div>
                        <div className="issue-body">
                          {it.explanation || (typeof it === 'string' ? it : null)}
                          {it.lines && <span className="issue-lines">Lines: {it.lines}</span>}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {!isPlaintext && result.suggestion && (
            <div className="result-card">
              <div className="result-card-header">
                <h3><span>💡</span> Suggestions</h3>
              </div>
              <div className="result-card-body">
                <SuggestionBody data={result.suggestion} />
              </div>
            </div>
          )}

          {/* Final Output */}
          {!isPlaintext && result.final && (
            <div className="result-card final-card">
              <div className="result-card-header final-card-header">
                <h3><span>✅</span> Summary</h3>
              </div>
              <div className="final-card-body">
                <FinalProse text={normalizeFinal(result.final)} className="final-text review-prose" />
              </div>
            </div>
          )}
        </div>
      )}

      <footer>
        <small>AI-powered code review for all stacks &middot; Built by{' '}
          <a href="https://ashikujjaman-shaikat.netlify.app/" target="_blank" rel="noreferrer">
            Ashikujjaman Shaikat
          </a>
        </small>
      </footer>
    </div>
  )
}
