import { useState, useEffect } from 'react'
import { apiPost } from '../api/client'
import useAuthStore from '../store/authStore'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import CandlestickChart from '../components/CandlestickChart'
import { ticksToCandles } from '../utils/ohlc'
import useChartZoom from '../hooks/useChartZoom'

export default function Dashboard() {
  const { token, email } = useAuthStore()
  const [amount, setAmount] = useState('')
  const [balance, setBalance] = useState(null)
  const [error, setError] = useState('')
  const [ticks, setTicks] = useState([])
  const [chartType, setChartType] = useState('line')

  useEffect(() => {
    const load = () =>
      fetch('http://localhost:5001/api/market/ticks')
        .then(r => r.json())
        .then(data => setTicks(data.map(d => ({
          timestamp: d.timestamp,
          time: d.timestamp.slice(11, 19),
          price: parseFloat(d.price.toFixed(2)),
          ma10: d.moving_average_10 ? parseFloat(d.moving_average_10.toFixed(2)) : null,
          ma30: d.moving_average_30 ? parseFloat(d.moving_average_30.toFixed(2)) : null,
        }))))
        .catch(() => {})
    load()
    const id = setInterval(load, 3000)
    return () => clearInterval(id)
  }, [])

  const { containerRef, visibleData, visibleCount } = useChartZoom(ticks, { min: 20, max: 400, step: 15 })

  const handleDeposit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const data = await apiPost('/api/wallets/deposit', { amount: parseFloat(amount) }, token)
      setBalance(data.newBalance)
      setAmount('')
    } catch (err) {
      setError(err.message)
    }
  }

  if (!token) return (
    <div style={{ padding: 40, color: 'var(--text-secondary)', fontFamily: 'var(--mono)', fontSize: 12 }}>
      ⚠ Not authenticated
    </div>
  )

  const latest = ticks[ticks.length - 1]
  const candles = ticksToCandles(visibleData, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {[
          { label: 'Account', value: email },
          { label: 'USD Balance', value: balance !== null ? `$${parseFloat(balance).toFixed(2)}` : '—' },
          { label: 'Last Price', value: latest ? `$${latest.price.toFixed(2)}` : '—' },
          { label: 'MA30', value: latest?.ma30 ? `$${latest.ma30.toFixed(2)}` : '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '10px 16px', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 500 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="panel" style={{ flex: 1, margin: 10, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header" style={{ justifyContent: 'space-between' }}>
            <span>BTC / USD — Simulated Feed</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['line', 'LINE'], ['candle', 'CANDLE']].map(([val, label]) => (
                <button key={val} onClick={() => setChartType(val)} style={{
                  padding: '2px 8px', fontSize: 9, letterSpacing: '0.06em',
                  background: chartType === val ? 'var(--accent)' : 'var(--bg-base)',
                  borderColor: chartType === val ? 'var(--accent)' : 'var(--border)',
                  color: chartType === val ? '#fff' : 'var(--text-secondary)',
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div ref={containerRef} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 4, right: 8, zIndex: 5,
              fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--mono)',
              background: 'var(--bg-panel)', padding: '2px 6px', border: '1px solid var(--border)',
            }}>
              {visibleCount} ticks · scroll to zoom
            </div>
            {chartType === 'line' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visibleData}>
                  <defs>
                    <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e53935" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#e53935" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e2030" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#6b7080', fontSize: 10, fontFamily: 'JetBrains Mono' }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: '#6b7080', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} width={65} />
                  <Tooltip contentStyle={{ background: '#161820', border: '1px solid #1e2030', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                  <Area type="monotone" dataKey="price" stroke="#e53935" strokeWidth={1.5} fill="url(#pg)" dot={false} name="Price" isAnimationActive={false} />
                  <Area type="monotone" dataKey="ma10" stroke="#00c853" strokeWidth={1} fill="none" dot={false} name="MA10" connectNulls strokeDasharray="4 2" isAnimationActive={false} />
                  <Area type="monotone" dataKey="ma30" stroke="#ffd600" strokeWidth={1} fill="none" dot={false} name="MA30" connectNulls strokeDasharray="4 2" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <CandlestickChart data={candles} />
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Fund Account</span>
        <form onSubmit={handleDeposit} style={{ display: 'flex', gap: 6 }}>
          <input type="number" step="0.01" min="0.01" placeholder="0.00" value={amount}
            onChange={e => setAmount(e.target.value)} required style={{ width: 90, textAlign: 'right' }} />
          <button type="submit" style={{ background: 'var(--buy-dim)', borderColor: 'var(--buy)', color: 'var(--buy)', padding: '4px 12px', fontSize: 10 }}>
            DEPOSIT
          </button>
        </form>
        {error && <span style={{ color: 'var(--sell)', fontSize: 11, fontFamily: 'var(--mono)' }}>✕ {error}</span>}
        {balance !== null && <span style={{ color: 'var(--buy)', fontFamily: 'var(--mono)', fontSize: 12 }}>Balance: ${parseFloat(balance).toFixed(2)}</span>}
      </div>
    </div>
  )
}