import { useState } from 'react'
import { apiPost } from '../api/client'
import useAuthStore from '../store/authStore'

function Dashboard() {
  const { token, email } = useAuthStore()
  const [amount, setAmount] = useState('')
  const [balance, setBalance] = useState(null)
  const [error, setError] = useState('')

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

      <form onSubmit={handleDeposit} style={{ maxWidth: '300px' }}>
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
    </div>
  )
}

export default Dashboard