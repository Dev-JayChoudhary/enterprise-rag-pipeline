import { useState, useRef, useEffect } from 'react'
import { ragAPI } from '../api'

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! Ask me anything about your documents.',
      meta: null
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')

    setMessages(prev => [...prev, { role: 'user', content: question, meta: null }])
    setLoading(true)

    try {
      const res = await ragAPI.query(question)
      const { answer, sources, latency_ms, tokens, chunks_retrieved, chunks_after_rerank } = res.data
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: answer,
        meta: { latency_ms, tokens, sources, chunks_retrieved, chunks_after_rerank }
      }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error: ' + (e.response?.data?.detail || 'Something went wrong'),
        meta: null
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const clearMemory = async () => {
    await ragAPI.clearMemory()
    setMessages([{ role: 'assistant', content: 'Memory cleared. Starting fresh!', meta: null }])
  }

  return (
    <div className="chat-container">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button className="btn-secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: '12px' }} onClick={clearMemory}>
          Clear Memory
        </button>
      </div>

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-bubble">{msg.content}</div>
            {msg.meta && (
              <div className="message-meta">
                {msg.meta.latency_ms.toFixed(0)}ms · {msg.meta.tokens} tokens · {msg.meta.chunks_retrieved}→{msg.meta.chunks_after_rerank} chunks
                {msg.meta.sources?.length > 0 && (
                  <div className="sources">📄 {msg.meta.sources.join(', ')}</div>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-bubble" style={{ color: '#64748b' }}>Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input">
        <input
          placeholder="Ask about your documents..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
        />
        <button onClick={send} disabled={loading} style={{ width: 'auto' }}>Send</button>
      </div>
    </div>
  )
}