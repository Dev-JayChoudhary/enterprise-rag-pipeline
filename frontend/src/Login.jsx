import React, { useState } from 'react'
import { authAPI } from './api'

export default function Login({ onAuthenticated }) {
  const [mode, setMode] = useState('LOGIN') // LOGIN | REGISTER
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [orgId, setOrgId] = useState('')
  const [role, setRole] = useState('member')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let user
      if (mode === 'LOGIN') {
        user = await authAPI.login(username, password)
      } else {
        user = await authAPI.register({ username, password, org_id: orgId, role })
      }
      onAuthenticated(user)
    } catch (err) {
      setError(err.message || 'AUTHENTICATION FAILED')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.screen}>
      <div className="grid-bg" />
      <div className="fog-bg" />
      <div className="scanlines" />

      <div style={styles.cardWrap}>
        <div className="panel" style={styles.card}>
          <div style={styles.crtLine} />

          <div style={{ textAlign: 'center', marginBottom: 34 }}>
            <div style={styles.brandRow}>
              <span style={styles.brandDot} />
              <span className="label" style={{ color: 'var(--text-faint)' }}>
                SESSION://GUEST
              </span>
            </div>
            <h1 style={styles.title}>ENTERPRISE RAG</h1>
            <p className="label" style={styles.subtitle}>
              SECURE DOCUMENT INTELLIGENCE
            </p>
          </div>

          <div style={styles.toggleRow}>
            {['LOGIN', 'REGISTER'].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setError('')
                }}
                style={{
                  ...styles.toggleBtn,
                  ...(mode === m ? styles.toggleBtnActive : {}),
                }}
              >
                {m}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ marginTop: 26 }}>
            <Field label="USERNAME">
              <input
                className="field"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ENTER USERNAME"
                autoComplete="username"
              />
            </Field>

            <Field label="PASSWORD">
              <input
                className="field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'LOGIN' ? 'current-password' : 'new-password'}
              />
            </Field>

            {mode === 'REGISTER' && (
              <>
                <Field label="ORG ID">
                  <input
                    className="field"
                    type="text"
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    placeholder="ORG-XXXX"
                  />
                </Field>

                <Field label="ROLE">
                  <div style={styles.roleRow}>
                    {['member', 'admin'].map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setRole(r)}
                        style={{
                          ...styles.roleBtn,
                          ...(role === r ? styles.roleBtnActive : {}),
                        }}
                      >
                        {r.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {error && <div style={styles.error}>ERR: {error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-solid"
              style={{ width: '100%', marginTop: 12, padding: '14px 22px' }}
            >
              {loading ? 'AUTHENTICATING…' : mode === 'LOGIN' ? 'ENTER SYSTEM' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <p style={styles.footNote}>
            {mode === 'LOGIN' ? 'NO ACCOUNT?' : 'ALREADY REGISTERED?'}{' '}
            <span
              onClick={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
              style={styles.footLink}
            >
              {mode === 'LOGIN' ? 'REGISTER HERE' : 'LOGIN HERE'}
            </span>
          </p>
        </div>

        <p style={styles.tinyFoot} className="label">
          v2.4.1 · ENCRYPTED CHANNEL · AES-256
        </p>
        <p style={{ ...styles.tinyFoot, marginTop: 6, color: 'var(--accent-soft)' }} className="label">
  BUILT BY JAY CHOUDHARY
</p>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label className="label" style={{ display: 'block', marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const styles = {
  screen: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg)',
    overflow: 'hidden',
    padding: 20,
  },
  cardWrap: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: 420,
  },
  card: {
    padding: '40px 36px',
    position: 'relative',
    animation: 'fadeUp 0.5s ease',
  },
  crtLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
    opacity: 0.6,
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--accent)',
    boxShadow: '0 0 8px var(--accent)',
  },
  title: {
    fontSize: 32,
    letterSpacing: 6,
    margin: '0 0 10px',
    color: 'var(--text)',
    textShadow: '0 0 20px rgba(74,222,128,0.35)',
  },
  subtitle: {
    margin: 0,
    color: 'var(--text-muted)',
  },
  toggleRow: {
    display: 'flex',
    border: '1px solid var(--border)',
  },
  toggleBtn: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-faint)',
    padding: '10px 0',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    letterSpacing: 2,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  toggleBtnActive: {
    background: 'var(--accent-dim)',
    color: 'var(--accent)',
  },
  roleRow: {
    display: 'flex',
    gap: 10,
  },
  roleBtn: {
    flex: 1,
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-faint)',
    padding: '10px 0',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: 2,
    cursor: 'pointer',
  },
  roleBtnActive: {
    borderColor: 'var(--border-strong)',
    color: 'var(--accent)',
    boxShadow: '0 0 10px rgba(74,222,128,0.2)',
  },
  error: {
    fontSize: 11,
    letterSpacing: 1,
    color: 'var(--danger)',
    border: '1px solid rgba(255,71,87,0.4)',
    background: 'rgba(255,71,87,0.08)',
    padding: '10px 12px',
    marginBottom: 14,
  },
  footNote: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 11,
    letterSpacing: 1,
    color: 'var(--text-faint)',
  },
  footLink: {
    color: 'var(--accent-soft)',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  tinyFoot: {
    textAlign: 'center',
    marginTop: 18,
    color: 'var(--text-faint)',
    fontSize: 10,
    letterSpacing: 2,
  },
}