import { useState, useEffect } from 'react'
import Login from './components/Login'
import Chat from './components/Chat'
import Ingest from './components/Ingest'
import './index.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('chat')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const username = localStorage.getItem('username')
    const org_id = localStorage.getItem('org_id')
    const role = localStorage.getItem('role')
    if (token && username) {
      setUser({ username, org_id, role })
    }
  }, [])

  const logout = () => {
    localStorage.clear()
    setUser(null)
  }

  if (!user) return <Login onLogin={setUser} />

  return (
    <div className="app">
      <div className="header">
        <div>
          <h2>Enterprise RAG Pipeline</h2>
          <div className="header-info">
            {user.username} · {user.org_id} · {user.role}
          </div>
        </div>
        <button className="btn-secondary" style={{ width: 'auto', padding: '6px 16px' }} onClick={logout}>
          Logout
        </button>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
          Chat
        </button>
        <button className={`tab ${tab === 'manage' ? 'active' : ''}`} onClick={() => setTab('manage')}>
          {user.role === 'admin' ? 'Ingest' : 'Stats'}
        </button>
      </div>

      {tab === 'chat' && <Chat />}
      {tab === 'manage' && <Ingest role={user.role} />}
    </div>
  )
}