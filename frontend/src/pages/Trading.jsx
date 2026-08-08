import { useState } from 'react'
import { apiPost } from '../api/client'
import useAuthStore from '../store/authStore'
import useOrderBookStore from '../store/orderBookStore'
import useOrderBookSocket from '../hooks/useOrderBookSocket'

function Trading() {
  const { token } = useAuthStore()
  const [side, setSide] = useState('BUY')
  const [orderType, setOrderType] = useState('LIMIT')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useOrderBookSocket()
  const orders = useOrderBookStore((state) => state.orders)
  const trades = useOrderBookStore((state) => state.trades)

  const handleSubmit = async (e) => {
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
      const idempotencyKey = crypto.randomUUID()
      const data = await apiPost('/api/orders', body, token, {
        'Idempotency-Key': idempotencyKey,
      })
      setResult(data)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!token) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Trading</h1>
        <p>Please log in to place orders.</p>
      </div>
    )
  }

  const openOrders = Object.values(orders).filter((o) => o.status === 'OPEN')
  const bids = openOrders.filter((o) => o.side === 'BUY')
  const asks = openOrders.filter((o) => o.side === 'SELL')

  return (
    <div style={{ padding: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      <div style={{ maxWidth: '360px' }}>
        <h1>Trading</h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Side</label><br />
            <select value={side} onChange={(e) => setSide(e.target.value)} style={{ width: '100%' }}>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Order Type</label><br />
            <select value={orderType} onChange={(e) => setOrderType(e.target.value)} style={{ width: '100%' }}>
              <option value="LIMIT">Limit</option>
              <option value="MARKET">Market</option>
            </select>
          </div>

          {orderType === 'LIMIT' && (
            <div style={{ marginBottom: '1rem' }}>
              <label>Price (USD)</label><br />
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label>Quantity</label><br />
            <input
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </div>

          <button type="submit">Place Order</button>
        </form>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        {result && (
          <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
            <p><strong>Order placed</strong></p>
            <p>ID: {result.id}</p>
            <p>Status: {result.status}</p>
            <p>Filled: {result.filledQuantity} / {result.quantity}</p>
          </div>
        )}
      </div>

      <div style={{ minWidth: '280px' }}>
        <h2>Order Book</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div>
            <h3 style={{ color: 'green' }}>Bids (Buy)</h3>
            {bids.length === 0 && <p style={{ color: '#888' }}>No open bids</p>}
            {bids.map((o) => (
              <div key={o.orderId} style={{ color: 'green' }}>
                {o.remainingQuantity} remaining — {o.status}
              </div>
            ))}
          </div>
          <div>
            <h3 style={{ color: 'red' }}>Asks (Sell)</h3>
            {asks.length === 0 && <p style={{ color: '#888' }}>No open asks</p>}
            {asks.map((o) => (
              <div key={o.orderId} style={{ color: 'red' }}>
                {o.remainingQuantity} remaining — {o.status}
              </div>
            ))}
          </div>
        </div>

        <h2 style={{ marginTop: '1.5rem' }}>Recent Trades</h2>
        {trades.length === 0 && <p style={{ color: '#888' }}>No trades yet</p>}
        {trades.map((t) => (
          <div key={t.tradeId}>
            {t.quantity} @ ${t.price}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Trading