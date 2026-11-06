import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import EmptyState from './EmptyState.jsx'

// This only controls what is shown. Backend endpoints must also use requireRole.
export default function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <p className="muted">Loading…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) {
    return <EmptyState icon="🔒" title="You don't have access to this page" actionLabel="Back to store" actionTo="/" />
  }
  return children
}
