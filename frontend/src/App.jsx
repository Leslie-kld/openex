import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import Dashboard from './pages/Dashboard'
import Trading from './pages/Trading'
import Login from './pages/Login'
import useAuthStore from './store/authStore'

function TickerBar() {
  const [price, setPrice] = useState(null)
  const [dir, setDir] = useState(null)
  const prev = useRef(null)

  useEffect(() => {
    const tick = () => {
      fetch('http://localhost:5001/api/market/ticks')
        .then(r => r.json())
        .then(data => {
          const latest = data[data.length - 1]?.price
          if (latest) {
            setDir(prev.current === null ? null : latest > prev.current ? 'up' : 'down')
            prev.current = latest
            setPrice(latest)
          }
        })
        .catch(() => {})
    }
    tick()
    const id = setInterval(tick, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>BTC/USD</span>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700,
        color: dir === 'up' ? 'var(--buy)' : dir === 'down' ? 'var(--sell)' : 'var(--text-primary)',
        transition: 'color 0.3s',
      }}>
        {price ? price.toFixed(2) : '—'}
      </span>
      {dir === 'up' && <span style={{ color: 'var(--buy)', fontSize: 10 }}>▲</span>}
      {dir === 'down' && <span style={{ color: 'var(--sell)', fontSize: 10 }}>▼</span>}
    </div>
  )
}

function NavBar() {
  const { token, email, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  if (location.pathname === '/login' && !token) return null

  return (
    <nav style={{
      height: 40, background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 16px', gap: 0, flexShrink: 0,
    }}>
      <span style={{
        fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15,
        color: 'var(--accent)', letterSpacing: '0.08em', marginRight: 24,
      }}>
        OPENEX
      </span>
      {token && [['/', 'DASHBOARD'], ['/trading', 'TERMINAL']].map(([path, label]) => (
        <NavLink key={path} to={path} end={path === '/'}
          style={({ isActive }) => ({
            padding: '0 14px', height: 40, display: 'flex', alignItems: 'center',
            fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none',
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
          })}>
          {label}
        </NavLink>
      ))}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        {token && <TickerBar />}
        {token ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-secondary)' }}>{email}</span>
            <button onClick={() => { logout(); navigate('/login') }} style={{ padding: '4px 10px', fontSize: 10 }}>LOGOUT</button>
          </div>
        ) : (
          <NavLink to="/login" style={{ fontSize: 11, color: 'var(--text-secondary)', textDecoration: 'none' }}>LOGIN</NavLink>
        )}
      </div>
    </nav>
  )
}

function ProtectedRoute({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <NavBar />
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/trading" element={<ProtectedRoute><Trading /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}