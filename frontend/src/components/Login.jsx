import { useState } from 'react'
import { authAPI } from '../api'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [orgId, setOrgId] = useState('')
  const [role, setRole] = useState('user')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    if (!username || !password) return setError('Fill all fields')
    setLoading(true)
    setError('')
    try {
      let res
      if (mode === 'login') {
        res = await authAPI.login(username, password)
      } else {
        if (!orgId) return setError('Fill all fields')
        res = await authAPI.register({ username, password, org_id: orgId, role })
      }
      const { access_token, org_id, role: userRole } = res.data
      localStorage.setItem('token', access_token)
      localStorage.setItem('org_id', org_id)
      localStorage.setItem('role', userRole)
      localStorage.setItem('username', username)
      onLogin({ username, org_id, role: userRole })
    } catch (e) {
      setError(e.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Enterprise RAG</h1>
        <p>Query your internal documents securely</p>

        <input
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {mode === 'register' && (
          <>
            <input
              placeholder="Organization ID (e.g. acme_corp)"
              value={orgId}
              onChange={e => setOrgId(e.target.value)}
            />
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </>
        )}

        {error && <div className="error">{error}</div>}

        <button onClick={handle} disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? 'Loading...' : mode === 'login' ? 'Login' : 'Register'}
        </button>

        <button
          className="btn-secondary"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  )
}