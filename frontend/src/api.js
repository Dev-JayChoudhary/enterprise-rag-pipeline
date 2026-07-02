import axios from 'axios'

const API_URL = 'http://15.252.18.226:8000'

const api = axios.create({
  baseURL: API_URL
})

// Add token to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (username, password) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    return api.post('/auth/login', formData)
  },
  me: () => api.get('/auth/me')
}

export const ragAPI = {
  query: (question, n_results = 3) =>
    api.post('/query', { question, use_memory: true, n_results }),
  ingest: (texts, metadatas) =>
    api.post('/ingest', { texts, metadatas }),
  stats: () => api.get('/stats'),
  clearMemory: () => api.delete('/memory')
}

export default api