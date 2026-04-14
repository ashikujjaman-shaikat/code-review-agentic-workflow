import React, { useState } from 'react'
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs/components/prism-core'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-markup-templating'
import 'prismjs/components/prism-jsx'
import 'prismjs/themes/prism.css'
import { submitCode } from './api'

function detectCodeType(code) {
  if (/import\s+React|from\s+['\"]react['\"]|<\w+\s*/.test(code)) return 'React'
  if (/express|require\(|module\.exports/.test(code)) return 'Node'
  return 'Unknown'
}

export default function App() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    const trimmed = (code || '').trim()
    // if (trimmed.length < 6) {
    //   setError('Please paste at least a few lines of code.')
    //   return
    // }
    setLoading(true)
    try {
      const resp = await submitCode(trimmed)
      setResult(resp.data)
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const codeType = detectCodeType(code)

  return (
    <div className="container">
      <h1>Code Reviewer</h1>
      <form onSubmit={onSubmit}>
        <label>Paste code to review</label>
        <div className="editor-wrapper">
          {!code && (
            <span className="editor-placeholder">Paste your React or Node.js code here…</span>
          )}
          <Editor
            value={code}
            onValueChange={setCode}
            highlight={(c) => highlight(c, languages.jsx, 'jsx')}
            padding={16}
            style={{
              fontFamily: "'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 13.5,
              lineHeight: 1.6,
              minHeight: '260px',
            }}
          />
          <span className="textarea-line-count">{code ? `${code.split('\n').length} lines` : ''}</span>
        </div>
        <div className="row">
          <div>Detected: <strong>{codeType}</strong></div>
          <button type="submit" disabled={loading}>{loading ? 'Reviewing…' : 'Submit'}</button>
        </div>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="results">
          <section>
            <h3>Review</h3>
            <pre>{result.review}</pre>
          </section>

          <section>
            <h3>Issues</h3>
            {Array.isArray(result.issues) ? (
              <ul>
                {result.issues.map((it, i) => (
                  <li key={i}>
                    <strong>{it.title || it[0] || 'Issue'}</strong>
                    <div className="muted">Severity: {it.severity || 'n/a'} {it.lines ? `• Lines: ${it.lines}` : ''}</div>
                    <pre>{it.explanation || JSON.stringify(it, null, 2)}</pre>
                  </li>
                ))}
              </ul>
            ) : (
              <pre>{JSON.stringify(result.issues, null, 2)}</pre>
            )}
          </section>

          <section>
            <h3>Suggestions</h3>
            <pre>{result.suggestion}</pre>
          </section>

          <section>
            <h3>Final Output</h3>
            <pre>{result.final}</pre>
          </section>
        </div>
      )}

      <footer>
        <small>AI-powered code review for React &amp; Node.js &middot; Built by <a href="https://ashikujjaman-shaikat.netlify.app/" target="_blank" rel="noreferrer">Ashikujjaman Shaikat</a></small>
      </footer>
    </div>
  )
}
