import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

// NOTE: Role check (only manager roles may enter) will be added here when İdil Y.'s auth work is done.
const links = [
  { to: '/admin', label: 'Overview', icon: '📊', end: true },
  { to: '/admin/products', label: 'Products & Stock', icon: '📦', role: 'Product Manager' },
  { to: '/admin/comments', label: 'Review Approval', icon: '💬', role: 'Product Manager' },
  { to: '/admin/orders', label: 'Deliveries', icon: '🚚', role: 'Product Manager' },
  { to: '/admin/reports', label: 'Revenue & Pricing', icon: '💰', role: 'Sales Manager' },
]

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="admin">
      <aside className={`admin-side ${open ? 'open' : ''}`}>
        <Link to="/admin" className="logo light">Skin<span>Wise</span> <small>Admin</small></Link>
        <nav>
          {links.map((l) => (
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
