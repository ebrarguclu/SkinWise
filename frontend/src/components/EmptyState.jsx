import { Link } from 'react-router-dom'

export default function EmptyState({ icon = '🧴', title, text, actionLabel, actionTo }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {actionLabel && <Link to={actionTo} className="btn btn-primary">{actionLabel}</Link>}
    </div>
  )
}
