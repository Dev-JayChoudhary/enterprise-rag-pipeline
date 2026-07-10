import React, { useState, useEffect } from 'react'
import Login from './Login.jsx'
import Chat from './Chat.jsx'
import Ingest from './Ingest.jsx'
import { authAPI } from './api.js'

  // ... rest of App stays exactly the same
export default function App() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('QUERY') // QUERY | MANAGE

  // Restore session on page refresh
  useEffect(() => {
    const token = localStorage.getItem('token')
    const username = localStorage.getItem('username')
    const org_id = localStorage.getItem('org_id')
    const role = localStorage.getItem('role')
    if (token && username) {
      setUser({ username, org_id, role })
    }
  }, [])

  if (!user) {
    return <Login onAuthenticated={setUser} />
  }

  function handleLogout() {
    authAPI.logout()
    setUser(null)
    setTab('QUERY')
  }

  return (
    <div style={styles.app}>
      <div className="grid-bg" />
      <div className="fog-bg" />
      <div className="scanlines" />

      <div style={styles.shell}>
        <nav style={styles.nav}>
          <div style={styles.navLeft}>
  <span style={styles.navDot} />
  <div>
    <span style={styles.brand}>ENTERPRISE RAG</span>
    <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-faint)', marginTop: 2 }}>
      BY JAY KUMAR CHOUDHARY
    </div>
  </div>
</div>

          <div style={styles.navCenter}>
            {['QUERY', 'MANAGE'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  ...styles.tabBtn,
                  ...(tab === t ? styles.tabBtnActive : {}),
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={styles.navRight}>
            <span className="label" style={styles.userInfo}>
              {user.username} <span style={{ color: 'var(--text-faint)' }}>/ {user.org_id}</span>
            </span>
            <button className="btn btn-ghost" onClick={handleLogout} style={styles.logoutBtn}>
              LOGOUT
            </button>
          </div>
        </nav>

        <main style={styles.main}>
          {tab === 'QUERY' ? <Chat /> : <Ingest user={user} />}
        </main>
      </div>
    </div>
  )
}

const styles = {
  app: {
    position: 'relative',
    minHeight: '100vh',
    background: 'var(--bg)',
    overflow: 'hidden',
  },
  shell: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 26px',
    borderBottom: '1px solid var(--border)',
    background: 'rgba(5, 10, 5, 0.75)',
    backdropFilter: 'blur(6px)',
    flexWrap: 'wrap',
    gap: 12,
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  navDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--accent)',
    boxShadow: '0 0 10px var(--accent)',
  },
  brand: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 3,
    color: 'var(--text)',
  },
  navCenter: {
    display: 'flex',
    border: '1px solid var(--border)',
  },
  tabBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-faint)',
    padding: '9px 24px',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: 3,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabBtnActive: {
    background: 'var(--accent-dim)',
    color: 'var(--accent)',
    boxShadow: 'inset 0 -2px 0 var(--accent)',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  userInfo: {
    color: 'var(--text-muted)',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  logoutBtn: {
    padding: '8px 16px',
    fontSize: 10,
  },
  main: {
    flex: 1,
    overflow: 'auto',
  },
}
