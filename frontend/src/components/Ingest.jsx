import { useState, useEffect } from 'react'
import { ragAPI } from '../api'

export default function Ingest({ role }) {
  const [text, setText] = useState('')
  const [source, setSource] = useState('')
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const res = await ragAPI.stats()
      setStats(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const ingest = async () => {
    if (!text.trim() || !source.trim()) return setStatus('error:Fill text and source')
    setLoading(true)
    setStatus('')
    try {
      const sentences = text.split('\n').filter(s => s.trim())
      const texts = sentences
      const metadatas = sentences.map(() => ({
        source: source.trim(),
        topic: topic.trim() || 'general'
      }))
      const res = await ragAPI.ingest(texts, metadatas)
      setStatus(`success:Added ${res.data.documents_added} chunks successfully`)
      setText('')
      loadStats()
    } catch (e) {
      setStatus('error:' + (e.response?.data?.detail || 'Failed to ingest'))
    } finally {
      setLoading(false)
    }
  }

  const [type, msg] = status.split(':')

  return (
    <div className="ingest-container">
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="num">{stats.total_documents}</div>
            <div className="label">Documents</div>
          </div>
          <div className="stat-card">
            <div className="num">{stats.memory_messages}</div>
            <div className="label">Memory Messages</div>
          </div>
          <div className="stat-card">
            <div className="num">{stats.role}</div>
            <div className="label">Your Role</div>
          </div>
        </div>
      )}

      {role === 'admin' ? (
        <div className="ingest-box">
          <h3>Ingest Documents</h3>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
            Each line becomes a separate chunk. Add source and topic metadata.
          </p>
          <textarea
            placeholder="Enter document text here...&#10;Each line will be a separate chunk.&#10;&#10;Example:&#10;RAG combines retrieval and generation for better answers&#10;Hybrid search uses BM25 and vector search merged with RRF"
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <input
            placeholder="Source (e.g. rag_paper.pdf)"
            value={source}
            onChange={e => setSource(e.target.value)}
          />
          <input
            placeholder="Topic (e.g. retrieval)"
            value={topic}
            onChange={e => setTopic(e.target.value)}
          />
          {status && <div className={type}>{msg}</div>}
          <button onClick={ingest} disabled={loading}>
            {loading ? 'Ingesting...' : 'Ingest Documents'}
          </button>
        </div>
      ) : (
        <div className="ingest-box">
          <h3>Document Management</h3>
          <p style={{ color: '#64748b', fontSize: '13px' }}>
            Only admins can ingest documents. Contact your admin to add documents.
          </p>
        </div>
      )}
    </div>
  )
}