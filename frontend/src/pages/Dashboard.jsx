import { useState, useEffect } from 'react'
import { apiPost } from '../api/client'
import useAuthStore from '../store/authStore'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

function Dashboard() {
  const { token, email } = useAuthStore()
  const [amount, setAmount] = useState('')
  const [balance, setBalance] = useState(null)
  const [error, setError] = useState('')
  const [ticks, setTicks] = useState([])
  const [chartError, setChartError] = useState('')

  useEffect(() => {
    fetch('http://localhost:5001/api/market/ticks')
      .then((r) => r.json())
      .then((data) => {
        const formatted = data.map((d) => ({
          time: d.timestamp.slice(11, 19),
          price: parseFloat(d.price.toFixed(2)),
          ma10: d.moving_average_10 ? parseFloat(d.moving_average_10.toFixed(2)) : null,
          ma30: d.moving_average_30 ? parseFloat(d.moving_average_30.toFixed(2)) : null,
        }))
        setTicks(formatted)
      })
      .catch(() => setChartError('Could not load market data'))
  }, [])

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

  if (!token) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Dashboard</h1>
        <p>Please log in to view your account.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard</h1>
      <p>Logged in as {email}</p>

      {balance !== null && (
        <p style={{ fontSize: '1.5rem' }}>Balance: ${balance} USD</p>
      )}

      <form onSubmit={handleDeposit} style={{ maxWidth: '300px', marginBottom: '2rem' }}>
        <label>Deposit amount (USD)</label><br />
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          style={{ width: '100%', marginBottom: '0.5rem' }}
        />
        <button type="submit">Deposit</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2>BTC/USD Simulated Price Feed</h2>
      {chartError && <p style={{ color: 'red' }}>{chartError}</p>}
      {ticks.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={ticks}>
            <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={19} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="price" stroke="#8884d8" dot={false} name="Price" />
            <Line type="monotone" dataKey="ma10" stroke="#82ca9d" dot={false} name="MA10" connectNulls />
            <Line type="monotone" dataKey="ma30" stroke="#ff7300" dot={false} name="MA30" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default Dashboard