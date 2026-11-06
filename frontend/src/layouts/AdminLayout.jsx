import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const links = [
  { to: '/admin', label: 'Overview', icon: '📊', end: true },
  { to: '/admin/products', label: 'Products & Stock', icon: '📦', role: 'Product Manager', only: 'product_manager' },
  { to: '/admin/comments', label: 'Review Approval', icon: '💬', role: 'Product Manager', only: 'product_manager' },
  { to: '/admin/orders', label: 'Deliveries', icon: '🚚', role: 'Product Manager', only: 'product_manager' },
  { to: '/admin/reports', label: 'Revenue & Pricing', icon: '💰', role: 'Sales Manager', only: 'sales_manager' },
]

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  return (
    <div className="admin">
      <aside className={`admin-side ${open ? 'open' : ''}`}>
        <Link to="/admin" className="logo light">Skin<span>Wise</span> <small>Admin</small></Link>
        <nav>
          {links.filter((l) => !l.only || l.only === user.role).map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}>
              <span>{l.icon}</span> {l.label}
              {l.role && <small>{l.role}</small>}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="back-store">← Back to store</Link>
      </aside>
      <div className="admin-main">
        <div className="admin-top">
          <button className="burger" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
          <span className="muted">Admin Panel</span>
        </div>
        <div className="admin-content"><Outlet /></div>
      </div>
    </div>
  )
}
