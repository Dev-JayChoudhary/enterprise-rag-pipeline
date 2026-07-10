import axios from 'axios'

const API_URL = '/api'

const api = axios.create({
  baseURL: API_URL
})

// Auto-attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authAPI = {
  login: async (username, password) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    const res = await api.post('/auth/login', formData)
    const { access_token, org_id, role } = res.data
    localStorage.setItem('token', access_token)
    localStorage.setItem('org_id', org_id)
    localStorage.setItem('role', role)
    localStorage.setItem('username', username)
    return { username, org_id, role }
  },

  register: async ({ username, password, org_id, role }) => {
    const res = await api.post('/auth/register', { username, password, org_id, role })
    const { access_token, org_id: oid, role: r } = res.data
    localStorage.setItem('token', access_token)
    localStorage.setItem('org_id', oid)
    localStorage.setItem('role', r)
    localStorage.setItem('username', username)
    return { username, org_id: oid, role: r }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('org_id')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
  }
}

export const ragAPI = {
  query: async (question) => {
    const res = await api.post('/query', {
      question,
      use_memory: true,
      n_results: 3
    })
    return res.data
  },

  ingest: async (texts, metadatas) => {
    const res = await api.post('/ingest', { texts, metadatas })
    return res.data
  },

  stats: async () => {
    const res = await api.get('/stats')
    return res.data
  },

  clearMemory: async () => {
    const res = await api.delete('/memory')
    return res.data
  }
}

export default api