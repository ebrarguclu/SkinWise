import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

// On small screens (≤ 960px, see index.css) the links collapse behind one ☰ button.
// The menu closes when you pick a link, press Escape, click outside it or change page.
export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const { count } = useCart()
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const headerRef = useRef(null)

  const close = () => setOpen(false)

  // Close the menu after navigation (also covers the browser back button).
  useEffect(() => { setOpen(false) }, [pathname])

  // While the menu is open: Escape or a click outside the header closes it.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const onClick = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  const submit = (e) => {
    e.preventDefault()
    navigate(`/products?q=${encodeURIComponent(q.trim())}`)
    close()
  }
  const handleLogout = async () => {
    close()
    await logout()
    toast.info('Logged out')
    navigate('/')
  }

  return (
    <header className="navbar" ref={headerRef}>
      <div className="container nav-inner">
        <Link to="/" className="logo" onClick={close}>Skin<span>Wise</span></Link>

        <button
          type="button"
          className="burger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="main-menu"
          onClick={() => setOpen(!open)}
        >
          <span aria-hidden="true">{open ? '✕' : '☰'}</span>
        </button>

        <nav id="main-menu" className={`nav-links ${open ? 'open' : ''}`} aria-label="Main">
          <NavLink to="/" end onClick={close}>Home</NavLink>
          <NavLink to="/products" onClick={close}>Shop</NavLink>
          <NavLink to="/wishlist" onClick={close}>Wishlist</NavLink>
          <NavLink to="/orders" onClick={close}>My Orders</NavLink>

          <form className="nav-search" onSubmit={submit} role="search">
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search products" />
          </form>

          <NavLink to="/cart" className="cart-link" onClick={close}>
            🛒 Cart {count > 0 && <b className="badge" aria-label={`${count} items`}>{count}</b>}
          </NavLink>
          <NavLink to="/profile" onClick={close}>Profile</NavLink>
          {user
            ? <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>Log out</button>
            : <Link to="/login" className="btn btn-outline btn-sm" onClick={close}>Log in</Link>}
        </nav>
      </div>
    </header>
  )
}
