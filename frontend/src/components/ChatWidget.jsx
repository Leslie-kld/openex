import { useState } from 'react'

function ChatWidget({ token }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!input.trim()) return
    const userMsg = { role: 'user', text: input }
    setMessages((m) => [...m, userMsg])
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
      setMessages((m) => [...m, { role: 'ai', text: data.reply }])
    } catch {
      setMessages((m) => [...m, { role: 'ai', text: 'Error reaching AI service.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: '1rem', maxWidth: 320 }}>
      <div style={{ height: 200, overflowY: 'auto', marginBottom: '0.5rem' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: '0.5rem', textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <span style={{
              background: m.role === 'user' ? '#8884d8' : '#eee',
              color: m.role === 'user' ? 'white' : 'black',
              padding: '0.25rem 0.5rem',
              borderRadius: 4,
              display: 'inline-block',
              maxWidth: '85%',
              wordBreak: 'break-word',
            }}>
              {m.text}
            </span>
          </div>
        ))}
        {loading && <div style={{ color: '#888' }}>Thinking...</div>}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask about your account..."
          style={{ flex: 1 }}
        />
        <button onClick={send}>Send</button>
      </div>
    </div>
  )
}

export default ChatWidget