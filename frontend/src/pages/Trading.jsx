import { useState, useRef, useEffect } from 'react'
import { apiPost } from '../api/client'
import useAuthStore from '../store/authStore'
import useOrderBookStore from '../store/orderBookStore'
import useOrderBookSocket from '../hooks/useOrderBookSocket'
import useResizableColumns from '../hooks/useResizableColumns'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import CandlestickChart from '../components/CandlestickChart'
import { ticksToCandles } from '../utils/ohlc'
import { playBuy, playSell, playFilled, playError } from '../utils/sounds'

// ── AI Advisor panel (embedded in left column) ──────────────────────────────
function AICorner({ token }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const msg = input
    setMessages(m => [...m, { role: 'user', text: msg }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'ai', text: data.reply }])
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Service unavailable.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {messages.length === 0 && (
        <div style={{
          padding: '10px 10px 0',
          color: 'var(--text-dim)',
          fontSize: 10,
          fontFamily: 'var(--mono)',
          lineHeight: 1.7,
        }}>
          Trading advisor — ask about order types, market mechanics, chart reading,
          or your positions. Scope: trading &amp; finance only.
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em', marginBottom: 2 }}>
              {m.role === 'user' ? 'YOU' : 'AI'}
            </div>
            <div style={{
              background: m.role === 'user' ? 'var(--bg-raised)' : 'var(--bg-base)',
              border: `1px solid ${m.role === 'user' ? 'var(--border-bright)' : 'var(--border)'}`,
              padding: '5px 8px',
              fontSize: 11,
              fontFamily: 'var(--mono)',
              maxWidth: '92%',
              wordBreak: 'break-word',
              lineHeight: 1.5,
              color: m.role === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ color: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--mono)' }}>
            processing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ borderTop: '1px solid var(--border)', display: 'flex', flexShrink: 0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="ask about trading..."
          style={{ flex: 1, border: 'none', borderRadius: 0, fontSize: 11, padding: '7px 8px' }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{ border: 'none', borderLeft: '1px solid var(--border)', padding: '0 12px', fontSize: 13 }}
        >
          ›
        </button>
      </div>
    </div>
  )
}

// ── Live P&L badge ───────────────────────────────────────────────────────────
function PnLBadge({ order, currentPrice }) {
  if (!currentPrice || !order.price || order.status === 'CANCELLED') {
    return <span style={{ color: 'var(--text-dim)' }}>—</span>
  }
  const direction = order.side === 'BUY' ? 1 : -1
  const pnl = direction * (currentPrice - parseFloat(order.price)) * parseFloat(order.quantity)
  const pct = (pnl / (parseFloat(order.price) * parseFloat(order.quantity))) * 100
  const color = pnl >= 0 ? 'var(--buy)' : 'var(--sell)'
  return (
    <span style={{ color, fontFamily: 'var(--mono)', fontSize: 11 }}>
      {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
    </span>
  )
}

// ── Main Trading terminal ────────────────────────────────────────────────────
export default function Trading() {
  const { token } = useAuthStore()
  const [side, setSide] = useState('BUY')
  const [orderType, setOrderType] = useState('LIMIT')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [orderHistory, setOrderHistory] = useState([])
  const [ticks, setTicks] = useState([])
  const [chartType, setChartType] = useState('line')

  useOrderBookSocket()
  const { widths, startDrag } = useResizableColumns([240, 180])
  const orders = useOrderBookStore(s => s.orders)
  const trades = useOrderBookStore(s => s.trades)
  const currentPrice = ticks[ticks.length - 1]?.price

  useEffect(() => {
    const load = () =>
      fetch('http://localhost:5001/api/market/ticks')
        .then(r => r.json())
        .then(data =>
          setTicks(data.map(d => ({
            timestamp: d.timestamp,
            time: d.timestamp.slice(11, 19),
            price: parseFloat(d.price.toFixed(2)),
            ma10: d.moving_average_10 ? parseFloat(d.moving_average_10.toFixed(2)) : null,
            ma30: d.moving_average_30 ? parseFloat(d.moving_average_30.toFixed(2)) : null,
          })))
        )
        .catch(() => {})
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setResult(null)
    const body = {
      side,
      orderType,
      quantity: parseFloat(quantity),
      ...(orderType === 'LIMIT' ? { price: parseFloat(price) } : {}),
    }
    try {
      const data = await apiPost('/api/orders', body, token, {
        'Idempotency-Key': crypto.randomUUID(),
      })
      setResult(data)
      setOrderHistory(h => [{ ...data, submittedAt: new Date().toLocaleTimeString() }, ...h])
      if (data.status === 'FILLED') playFilled()
      else side === 'BUY' ? playBuy() : playSell()
    } catch (err) {
      setError(err.message)
      playError()
    }
  }

  const openOrders = Object.values(orders).filter(o => o.status === 'OPEN')
  const bids = openOrders.filter(o => o.side === 'BUY')
  const asks = openOrders.filter(o => o.side === 'SELL')
  const candles = ticksToCandles(ticks, 10)

  if (!token) return (
    <div style={{ padding: 40, color: 'var(--text-secondary)', fontFamily: 'var(--mono)', fontSize: 12 }}>
      ⚠ Not authenticated
    </div>
  )

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `${widths[0]}px 1fr ${widths[1]}px`,
      gridTemplateRows: '1fr 140px',
      height: '100%',
      gap: 0,
      background: 'var(--border)',
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Drag handle: AI panel <-> Chart */}
      <div
        onMouseDown={startDrag(0)}
        style={{
          position: 'absolute', left: widths[0] - 2, top: 0, bottom: 140,
          width: 4, cursor: 'col-resize', zIndex: 10, background: 'transparent',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      />

      {/* Drag handle: Chart <-> Order panel */}
      <div
        onMouseDown={startDrag(1)}
        style={{
          position: 'absolute', right: widths[1] - 2, top: 0, bottom: 140,
          width: 4, cursor: 'col-resize', zIndex: 10, background: 'transparent',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      />

      {/* ── COL 1 FULL HEIGHT: AI Advisor ── */}
      <div className="panel" style={{ gridRow: '1 / 3', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>
        <div className="panel-header">AI Advisor</div>
        <AICorner token={token} />
      </div>

      {/* ── COL 2 TOP: Chart ── */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="panel-header" style={{ justifyContent: 'space-between' }}>
          <span>BTC / USD</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[['line', '∿ LINE'], ['candle', '☰ CANDLE']].map(([v, l]) => (
              <button key={v} onClick={() => setChartType(v)} style={{
                padding: '1px 7px', fontSize: 9,
                background: chartType === v ? 'var(--accent)' : 'transparent',
                borderColor: chartType === v ? 'var(--accent)' : 'var(--border)',
                color: chartType === v ? '#fff' : 'var(--text-secondary)',
              }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          {chartType === 'line' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ticks}>
                <defs>
                  <linearGradient id="tpg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e53935" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#e53935" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e2030" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#6b7080', fontSize: 9, fontFamily: 'JetBrains Mono' }} interval={19} tickLine={false} axisLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: '#6b7080', fontSize: 9, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} width={62} />
                <Tooltip contentStyle={{ background: '#161820', border: '1px solid #1e2030', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                <Area type="monotone" dataKey="price" stroke="#e53935" strokeWidth={1.5} fill="url(#tpg)" dot={false} name="Price" />
                <Area type="monotone" dataKey="ma10" stroke="#00c853" strokeWidth={1} fill="none" dot={false} name="MA10" connectNulls strokeDasharray="4 2" />
                <Area type="monotone" dataKey="ma30" stroke="#ffd600" strokeWidth={1} fill="none" dot={false} name="MA30" connectNulls strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <CandlestickChart data={candles} />
          )}
        </div>
      </div>

      {/* ── COL 3 TOP: Order entry ── */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'auto', borderLeft: '1px solid var(--border)' }}>
        <div className="panel-header">New Order</div>
        <div style={{ padding: 8, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {['BUY', 'SELL'].map(s => (
              <button key={s} onClick={() => setSide(s)} className={side === s ? s.toLowerCase() : ''}
                style={{ padding: '9px 0', fontWeight: side === s ? 700 : 400, fontSize: 12 }}>
                {s === 'BUY' ? '▲ ' : '▼ '}{s}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {['LIMIT', 'MARKET'].map(t => (
              <button key={t} onClick={() => setOrderType(t)} style={{
                padding: '4px 0', fontSize: 10,
                background: orderType === t ? 'var(--border-bright)' : 'var(--bg-base)',
                borderColor: orderType === t ? 'var(--border-bright)' : 'var(--border)',
                color: orderType === t ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}>{t}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orderType === 'LIMIT' && (
              <div>
                <label>Price (USD)</label>
                <input type="number" step="0.01" value={price}
                  onChange={e => setPrice(e.target.value)} required placeholder="0.00" />
              </div>
            )}
            <div>
              <label>Quantity</label>
              <input type="number" step="0.01" min="0.01" value={quantity}
                onChange={e => setQuantity(e.target.value)} required placeholder="0.00" />
            </div>
            <button type="submit" className={side.toLowerCase()}
              style={{ padding: '10px 0', width: '100%', fontWeight: 700, fontSize: 12 }}>
              {side === 'BUY' ? '▲ BUY' : '▼ SELL'}
            </button>
          </form>

          {error && (
            <div style={{ color: 'var(--sell)', fontSize: 10, fontFamily: 'var(--mono)', padding: '5px 6px', background: 'var(--sell-dim)', border: '1px solid var(--sell)' }}>
              ✕ {error}
            </div>
          )}

          {result && (
            <div style={{
              padding: 8,
              border: `1px solid ${result.status === 'FILLED' ? 'var(--buy)' : 'var(--border-bright)'}`,
              background: result.status === 'FILLED' ? 'var(--buy-dim)' : 'var(--bg-raised)',
              fontFamily: 'var(--mono)', fontSize: 10,
            }}>
              <div style={{ color: result.status === 'FILLED' ? 'var(--buy)' : 'var(--text-secondary)', fontWeight: 700, marginBottom: 3 }}>
                {result.status === 'FILLED' ? '✓ FILLED' : '● OPEN'}
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>Qty {result.filledQuantity}/{result.quantity}</div>
            </div>
          )}

          {currentPrice && (
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: 2 }}>MARKET</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700 }}>
                {currentPrice.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── COL 2 BOTTOM: Order history + P&L ── */}
      <div className="panel" style={{ overflow: 'auto' }}>
        <div className="panel-header">Order History — Live P&amp;L</div>
        {orderHistory.length === 0 ? (
          <div style={{ padding: 8, color: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--mono)' }}>
            No orders this session
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: 'var(--mono)' }}>
            <thead>
              <tr>
                {['TIME', 'SIDE', 'TYPE', 'QTY', 'PRICE', 'STATUS', 'P&L'].map(h => (
                  <th key={h} style={{
                    padding: '3px 8px', textAlign: 'left',
                    borderBottom: '1px solid var(--border)',
                    fontWeight: 400, fontSize: 9,
                    color: 'var(--text-secondary)', letterSpacing: '0.08em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orderHistory.map((o, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '3px 8px', color: 'var(--text-dim)' }}>{o.submittedAt}</td>
                  <td style={{ padding: '3px 8px', color: o.side === 'BUY' ? 'var(--buy)' : 'var(--sell)', fontWeight: 600 }}>{o.side}</td>
                  <td style={{ padding: '3px 8px', color: 'var(--text-secondary)' }}>{o.orderType}</td>
                  <td style={{ padding: '3px 8px' }}>{o.quantity}</td>
                  <td style={{ padding: '3px 8px' }}>{o.price ? `$${o.price}` : 'MKT'}</td>
                  <td style={{ padding: '3px 8px', color: o.status === 'FILLED' ? 'var(--buy)' : 'var(--text-secondary)' }}>{o.status}</td>
                  <td style={{ padding: '3px 8px' }}><PnLBadge order={o} currentPrice={currentPrice} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── COL 3 BOTTOM: Order book + recent trades ── */}
      <div className="panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)' }}>
        <div className="panel-header">Order Book</div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ padding: '2px 8px', fontSize: 9, color: 'var(--sell)', letterSpacing: '0.1em', borderBottom: '1px solid var(--border)' }}>ASKS</div>
          {asks.length === 0
            ? <div style={{ padding: '5px 8px', color: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--mono)' }}>—</div>
            : asks.map(o => (
              <div key={o.orderId} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', fontFamily: 'var(--mono)', fontSize: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--sell)' }}>SELL</span>
                <span style={{ color: 'var(--text-secondary)' }}>{parseFloat(o.remainingQuantity).toFixed(3)}</span>
              </div>
            ))
          }
          <div style={{ padding: '2px 8px', fontSize: 9, color: 'var(--buy)', letterSpacing: '0.1em', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>BIDS</div>
          {bids.length === 0
            ? <div style={{ padding: '5px 8px', color: 'var(--text-dim)', fontSize: 10, fontFamily: 'var(--mono)' }}>—</div>
            : bids.map(o => (
              <div key={o.orderId} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', fontFamily: 'var(--mono)', fontSize: 10, borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--buy)' }}>BUY</span>
                <span style={{ color: 'var(--text-secondary)' }}>{parseFloat(o.remainingQuantity).toFixed(3)}</span>
              </div>
            ))
          }
        </div>
        <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ padding: '2px 8px', fontSize: 9, color: 'var(--text-secondary)', letterSpacing: '0.1em', borderBottom: '1px solid var(--border)' }}>TRADES</div>
          {trades.slice(0, 5).map(t => (
            <div key={t.tradeId} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', fontFamily: 'var(--mono)', fontSize: 10, borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--buy)' }}>{parseFloat(t.quantity).toFixed(3)}</span>
              <span style={{ color: 'var(--text-secondary)' }}>${parseFloat(t.price).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}