import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../api/client'
import useAuthStore from '../store/authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const setAuth = useAuthStore(s => s.setAuth)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const data = await apiPost(
        mode === 'login' ? '/api/auth/login' : '/api/auth/register',
        { email, password }
      )
      setAuth(data.token, email)
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
    }}>
      <div style={{ width: 320 }}>
        <div className="panel">
          <div className="panel-header">
            {mode === 'login' ? 'Operator Login' : 'Create Account'}
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <div>
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {error && (
              <div style={{ color: 'var(--sell)', fontSize: 11, fontFamily: 'var(--mono)' }}>
                ✕ {error}
              </div>
            )}
            <button
              onClick={handleSubmit}
              style={{
                background: 'var(--accent)',
                border: 'none',
                color: '#fff',
                padding: '9px 0',
                width: '100%',
                letterSpacing: '0.1em',
              }}
            >
              {mode === 'login' ? 'CONNECT' : 'REGISTER'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                style={{ border: 'none', background: 'none', color: 'var(--text-secondary)', fontSize: 11 }}
              >
                {mode === 'login' ? 'New operator? Register →' : '← Back to login'}
              </button>
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 12,
          fontSize: 10,
          color: 'var(--text-dim)',
          textAlign: 'center',
          letterSpacing: '0.05em',
          fontFamily: 'var(--mono)',
        }}>
          OPENEX SIMULATION PLATFORM — NOT REAL FINANCIAL ADVICE
        </div>
      </div>
    </div>
  )
}