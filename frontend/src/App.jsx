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

export default function App() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [editorLang, setEditorLang] = useState('javascript')

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

  // const codeType = detectCodeType(code)

  return (
    <div className="container">
      <h1>Code Reviewer</h1>
      <p style={{ color: 'var(--muted)', marginTop: 0, marginBottom: 16, fontSize: 14 }}>
        Supports all major stacks — React, Vue, Angular, TypeScript, Python, Java, C#, Go, Rust, PHP, Ruby, Swift, Kotlin, Dart, SQL, Bash, Docker, and more.
      </p>
      <form onSubmit={onSubmit}>
        <label>Paste code to review</label>
        <div className="editor-wrapper">
          {!code && (
            <span className="editor-placeholder">Paste code to review — any language or framework…</span>
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
          <span className="textarea-line-count">{code ? `${code.split('\n').length} lines` : ''}</span>
        </div>
        <div className="row" style={{ justifyContent: 'center', marginTop: 20 }}>
          {/* <div>Detected: <strong>{codeType}</strong></div> */}
          <button type="submit" disabled={loading}>{loading ? 'Reviewing…' : 'Submit'}</button>
        </div>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="results">
          {result.language && (
            <div className="lang-badge">Detected: <strong>{LANG_LABELS[result.language] || result.language}</strong></div>
          )}
          <section>
            <h3>{result.language === 'plaintext' ? 'Analysis' : 'Review'}</h3>
            <pre>{result.review}</pre>
          </section>

          {result.language !== 'plaintext' && (
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
          )}

          {result.language !== 'plaintext' && (
            <section>
              <h3>Suggestions</h3>
              <pre>{result.suggestion}</pre>
            </section>
          )}

          {result.language !== 'plaintext' && (
            <section>
              <h3>Final Output</h3>
              <pre>{result.final}</pre>
            </section>
          )}
        </div>
      )}

      <footer>
        <small>AI-powered code review for all stacks &middot; Built by <a href="https://ashikujjaman-shaikat.netlify.app/" target="_blank" rel="noreferrer">Ashikujjaman Shaikat</a></small>
      </footer>
    </div>
  )
}
