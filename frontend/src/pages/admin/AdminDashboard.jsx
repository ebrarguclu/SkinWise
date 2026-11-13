import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader.jsx'

export default function AdminDashboard() {
  const stats = [
    { label: 'Reviews awaiting approval', value: '—', icon: '💬' },
    { label: 'Orders to deliver', value: '—', icon: '🚚' },
    { label: 'Low-stock products', value: '—', icon: '📦' },
    { label: 'Revenue this month', value: '—', icon: '💰' },
  ]
  return (
    <>
      <PageHeader title="Overview" subtitle="Numbers will fill in once the backend is connected." />
      <div className="stats">
        {stats.map((s) => (
          <div key={s.label} className="card pad stat"><span>{s.icon}</span><strong>{s.value}</strong><small className="muted">{s.label}</small></div>
        ))}
      </div>
      <div className="row gap wrap mt">
        <Link to="/admin/comments" className="btn btn-outline">Review comments</Link>
        <Link to="/admin/orders" className="btn btn-outline">Delivery list</Link>
      </div>
    </>
  )
}
