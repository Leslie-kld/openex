import { useState, useRef, useEffect } from 'react'

export default function ChatWidget({ token }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', text: input }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: input }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'ai', text: data.reply }])
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Connection error.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ color: 'var(--text-dim)', fontSize: 11, fontFamily: 'var(--mono)', marginTop: 8 }}>
            Ask about your balance, orders, or trading concepts.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em', marginBottom: 2 }}>
              {m.role === 'user' ? 'YOU' : 'AI'}
            </div>
            <div style={{
              background: m.role === 'user' ? 'var(--bg-raised)' : 'var(--bg-base)',
              border: `1px solid ${m.role === 'user' ? 'var(--border-bright)' : 'var(--border)'}`,
              padding: '6px 8px',
              fontSize: 11,
              fontFamily: 'var(--mono)',
              maxWidth: '90%',
              wordBreak: 'break-word',
              lineHeight: 1.5,
              color: m.role === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ color: 'var(--text-dim)', fontSize: 11, fontFamily: 'var(--mono)' }}>
            processing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ borderTop: '1px solid var(--border)', display: 'flex' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="ask ai..."
          style={{ flex: 1, border: 'none', borderRadius: 0, padding: '8px 10px', fontSize: 11 }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{ border: 'none', borderLeft: '1px solid var(--border)', borderRadius: 0, padding: '0 12px', fontSize: 10 }}
        >
          ›
        </button>
      </div>
    </div>
  )
}