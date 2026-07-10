import React, { useEffect, useRef, useState } from 'react'
import { ragAPI } from './api'

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      answer:
        'SYSTEM READY. ASK A QUESTION ABOUT YOUR INGESTED DOCUMENTS TO BEGIN.',
      sources: [],
      latency_ms: 0,
      tokens: 0,
      chunks_retrieved: 0,
      chunks_after_rerank: 0,
      system: true,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend() {
    const question = input.trim()
    if (!question || loading) return

    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setInput('')
    setLoading(true)

    try {
      const res = await ragAPI.query(question)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          answer: res.answer,
          sources: res.sources || [],
          latency_ms: res.latency_ms,
          tokens: res.tokens,
          chunks_retrieved: res.chunks_retrieved,
          chunks_after_rerank: res.chunks_after_rerank,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          answer: `ERR: QUERY FAILED — ${err.message || 'UNKNOWN ERROR'}`,
          sources: [],
          error: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function handleClearMemory() {
    setClearing(true)
    try {
      await ragAPI.clearMemory()
      setMessages([
        {
          role: 'assistant',
          answer: 'MEMORY CLEARED. CONTEXT RESET TO ZERO.',
          sources: [],
          system: true,
        },
      ])
    } finally {
      setClearing(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.topBar}>
        <span className="label" style={{ color: 'var(--text-faint)' }}>
          THREAD://ACTIVE · {messages.filter((m) => m.role === 'user').length} QUERIES
        </span>
        <button
          className="btn btn-ghost"
          onClick={handleClearMemory}
          disabled={clearing}
          style={{ padding: '8px 16px', fontSize: 10 }}
        >
          {clearing ? 'CLEARING…' : 'CLEAR MEMORY'}
        </button>
      </div>

      <div ref={scrollRef} style={styles.messages}>
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <UserBubble key={i} text={m.text} />
          ) : (
            <AssistantBubble key={i} msg={m} />
          )
        )}

        {loading && <TypingIndicator />}
      </div>

      <div style={styles.inputBar}>
        <textarea
          className="field"
          rows={1}
          placeholder="ASK ABOUT YOUR DOCUMENTS…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={styles.textarea}
        />
        <button
          className="btn btn-solid"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={styles.sendBtn}
        >
          SEND
        </button>
      </div>
    </div>
  )
}

function UserBubble({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', animation: 'fadeUp 0.3s ease' }}>
      <div style={styles.userBubble}>{text}</div>
    </div>
  )
}

function AssistantBubble({ msg }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'fadeUp 0.3s ease' }}>
      <div>
        <div
          className="panel"
          style={{
            ...styles.assistantBubble,
            ...(msg.error ? styles.assistantBubbleError : {}),
          }}
        >
          {msg.answer}
        </div>
        {!msg.system && (
          <div style={styles.meta}>
            {msg.latency_ms}ms · {msg.tokens} TOKENS · {msg.chunks_retrieved}→{msg.chunks_after_rerank} CHUNKS
            {msg.sources && msg.sources.length > 0 && (
              <> · SOURCE: {msg.sources.join(', ')}</>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <div className="panel" style={{ ...styles.assistantBubble, display: 'flex', gap: 5, alignItems: 'center', width: 'fit-content' }}>
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 24px',
    borderBottom: '1px solid var(--border)',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  userBubble: {
    maxWidth: '70%',
    background: 'var(--accent)',
    color: '#04140a',
    padding: '12px 16px',
    fontSize: 13,
    lineHeight: 1.6,
    boxShadow: '0 0 18px rgba(74,222,128,0.3)',
  },
  assistantBubble: {
    maxWidth: '640px',
    padding: '14px 18px',
    fontSize: 13,
    lineHeight: 1.7,
    color: 'var(--text)',
  },
  assistantBubbleError: {
    borderColor: 'rgba(255,71,87,0.5)',
    color: '#ff8a94',
  },
  meta: {
    marginTop: 6,
    fontSize: 10,
    letterSpacing: 0.5,
    color: 'var(--text-faint)',
    paddingLeft: 2,
  },
  inputBar: {
    display: 'flex',
    gap: 12,
    padding: '18px 24px',
    borderTop: '1px solid var(--border)',
  },
  textarea: {
    flex: 1,
    resize: 'none',
    maxHeight: 120,
  },
  sendBtn: {
    padding: '0 28px',
  },
}