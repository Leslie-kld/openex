import { Link } from 'react-router-dom'

function NavBar() {
  return (
    <nav style={{ display: 'flex', gap: '1.5rem', padding: '1rem', borderBottom: '1px solid #ccc' }}>
      <Link to="/">Dashboard</Link>
      <Link to="/trading">Trading</Link>
      <Link to="/login">Login</Link>
    </nav>
  )
}

export default NavBar