import React, { useEffect, useState } from 'react'
import { ragAPI } from './api'

export default function Ingest({ user }) {
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const [text, setText] = useState('')
  const [source, setSource] = useState('')
  const [topic, setTopic] = useState('')
  const [ingesting, setIngesting] = useState(false)
  const [result, setResult] = useState(null)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    setStatsLoading(true)
    try {
      const res = await ragAPI.stats()
      setStats(res)
    } finally {
      setStatsLoading(false)
    }
  }

  async function handleIngest() {
    if (!text.trim() || ingesting) return
    setIngesting(true)
    setResult(null)
    try {
      const res = await ragAPI.ingest([text], [{ source: source || 'UNKNOWN', topic: topic || 'GENERAL' }])
      setResult({ ok: true, ...res })
      setText('')
      setSource('')
      setTopic('')
      loadStats()
    } catch (err) {
      setResult({ ok: false, message: err.message || 'INGEST FAILED' })
    } finally {
      setIngesting(false)
    }
  }

  if (!isAdmin) {
    return (
      <div style={styles.restrictedWrap}>
        <div className="panel" style={styles.restrictedCard}>
          <div style={styles.lockIcon}>
            <LockIcon />
          </div>
          <h2 style={styles.restrictedTitle}>ACCESS RESTRICTED</h2>
          <p className="mono-muted" style={{ textAlign: 'center' }}>
            THIS AREA REQUIRES ADMIN CLEARANCE.
            <br />
            CURRENT ROLE: {(user?.role || 'UNKNOWN').toUpperCase()}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.statsRow}>
        <StatCard
          label="DOCUMENTS"
          value={statsLoading ? '—' : stats?.total_documents}
        />
        <StatCard
          label="MEMORY"
          value={statsLoading ? '—' : stats?.memory_messages}
        />
        <StatCard
          label="ROLE"
          value={statsLoading ? '—' : (stats?.role || '').toUpperCase()}
          isText
        />
      </div>

      <div className="panel" style={styles.form}>
        <div style={styles.formHeader}>
          <span className="label">INGEST NEW DOCUMENT</span>
          <span className="label" style={{ color: 'var(--text-faint)' }}>
            ORG: {user?.org_id}
          </span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="label" style={styles.fieldLabel}>
            DOCUMENT TEXT
          </label>
          <textarea
            className="field"
            rows={7}
            placeholder="PASTE OR TYPE DOCUMENT CONTENT…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div style={styles.rowFields}>
          <div style={{ flex: 1 }}>
            <label className="label" style={styles.fieldLabel}>
              SOURCE
            </label>
            <input
              className="field"
              type="text"
              placeholder="E.G. RAG_DOCS.PDF"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label" style={styles.fieldLabel}>
              TOPIC
            </label>
            <input
              className="field"
              type="text"
              placeholder="E.G. ONBOARDING"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
        </div>

        {result && (
          <div
            style={{
              ...styles.resultBox,
              ...(result.ok ? {} : styles.resultBoxError),
            }}
          >
            {result.ok
              ? `OK — ${result.documents_added} DOCUMENT(S) ADDED · STATUS: ${result.status}`
              : `ERR: ${result.message}`}
          </div>
        )}

        <button
          className="btn btn-solid"
          onClick={handleIngest}
          disabled={ingesting || !text.trim()}
          style={{ marginTop: 18 }}
        >
          {ingesting ? 'INGESTING…' : 'INGEST DOCUMENT'}
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value, isText }) {
  return (
    <div className="panel" style={styles.statCard}>
      <div style={{ ...styles.statValue, fontSize: isText ? 22 : 34 }}>{value}</div>
      <div className="label" style={{ marginTop: 6 }}>
        {label}
      </div>
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="10" width="16" height="10" rx="1" />
      <path d="M7 10V7a5 5 0 0110 0v3" />
      <circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

const styles = {
  wrap: {
    padding: '28px 24px 60px',
    maxWidth: 900,
    margin: '0 auto',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    marginBottom: 28,
  },
  statCard: {
    padding: '22px 20px',
    textAlign: 'center',
  },
  statValue: {
    color: 'var(--accent)',
    fontWeight: 700,
    textShadow: '0 0 16px rgba(74,222,128,0.35)',
    letterSpacing: 1,
  },
  form: {
    padding: '26px 28px',
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
    paddingBottom: 14,
    borderBottom: '1px solid var(--border)',
  },
  fieldLabel: {
    display: 'block',
    marginBottom: 8,
  },
  rowFields: {
    display: 'flex',
    gap: 16,
  },
  resultBox: {
    marginTop: 16,
    fontSize: 11,
    letterSpacing: 0.5,
    padding: '10px 12px',
    border: '1px solid var(--border)',
    background: 'var(--accent-dim)',
    color: 'var(--accent-soft)',
  },
  resultBoxError: {
    border: '1px solid rgba(255,71,87,0.4)',
    background: 'rgba(255,71,87,0.08)',
    color: '#ff8a94',
  },
  restrictedWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    padding: 24,
  },
  restrictedCard: {
    padding: '48px 56px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
  },
  lockIcon: {
    color: 'var(--accent)',
    filter: 'drop-shadow(0 0 10px rgba(74,222,128,0.4))',
    marginBottom: 4,
  },
  restrictedTitle: {
    margin: 0,
    letterSpacing: 4,
    fontSize: 20,
    color: 'var(--text)',
  },
}