import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const { count } = useCart()
  const navigate = useNavigate()

  const submit = (e) => {
    e.preventDefault()
    navigate(`/products?q=${encodeURIComponent(q.trim())}`)
    setOpen(false)
  }
  const close = () => setOpen(false)

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="logo" onClick={close}>Skin<span>Wise</span></Link>

        <button className="burger" aria-label="Toggle menu" onClick={() => setOpen(!open)}>
          {open ? '✕' : '☰'}
        </button>

        <nav className={`nav-links ${open ? 'open' : ''}`}>
          <NavLink to="/" end onClick={close}>Home</NavLink>
          <NavLink to="/products" onClick={close}>Shop</NavLink>
          <NavLink to="/wishlist" onClick={close}>Wishlist</NavLink>
          <NavLink to="/orders" onClick={close}>My Orders</NavLink>

          <form className="nav-search" onSubmit={submit} role="search">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" aria-label="Search products" />
          </form>

          <NavLink to="/cart" className="cart-link" onClick={close}>
            🛒 Cart {count > 0 && <b className="badge">{count}</b>}
          </NavLink>
          <NavLink to="/profile" onClick={close}>Profile</NavLink>
          <Link to="/login" className="btn btn-outline btn-sm" onClick={close}>Log in</Link>
        </nav>
      </div>
    </header>
  )
}
