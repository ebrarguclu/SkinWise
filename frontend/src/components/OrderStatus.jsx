import { STATUS_STEPS, statusInfo, statusStepIndex } from '../lib/orders.js'

// Coloured label for an order status (Jira DP-54).
export function StatusBadge({ status }) {
  const { label, color, background } = statusInfo(status)
  return (
    <span className="tag" style={{ color, background, fontSize: '.8rem' }}>{label}</span>
  )
}

// Processing → In transit → Delivered, with the steps reached so far filled in.
// A cancelled order shows only its message, because it is not on this path.
export function StatusSteps({ status }) {
  const current = statusStepIndex(status)
  const { text } = statusInfo(status)

  if (current === -1) {
    return text ? <p className="muted" style={{ margin: '.6rem 0 0' }}>{text}</p> : null
  }

  return (
    <div style={{ marginTop: '.8rem' }} aria-label={`Order status: ${statusInfo(status).label}`}>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: `repeat(${STATUS_STEPS.length}, 1fr)`, gap: '.4rem' }}>
        {STATUS_STEPS.map((step, i) => {
          const reached = i <= current
          return (
            <li key={step} aria-current={i === current ? 'step' : undefined}>
              <div style={{ height: 6, borderRadius: 999, background: reached ? 'var(--primary)' : 'var(--line)' }} />
              <small style={{ display: 'block', marginTop: '.3rem', fontWeight: i === current ? 700 : 400, color: reached ? 'var(--text)' : 'var(--muted)' }}>
                {statusInfo(step).label}
              </small>
            </li>
          )
        })}
      </ol>
      <p className="muted" style={{ margin: '.4rem 0 0', fontSize: '.9rem' }}>{text}</p>
    </div>
  )
}
