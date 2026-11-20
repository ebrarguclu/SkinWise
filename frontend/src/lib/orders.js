// Order history rules (Jira DP-53). Pure functions, easy to unit test.

// Newest order first. The backend already sorts, this keeps the page safe on its own.
export function sortNewestFirst(orders) {
  return [...(orders ?? [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

// "17 Nov 2026, 21:05"
export function formatOrderDate(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

// Total number of pieces in an order: 2 serums + 1 cream = 3
export const itemCount = (order) =>
  (order?.items ?? []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

// "3 items" / "1 item"
export const itemCountLabel = (order) => {
  const count = itemCount(order)
  return `${count} ${count === 1 ? 'item' : 'items'}`
}

// Price of one line: unit price paid × quantity, in cents to avoid rounding errors.
export const lineTotal = (item) =>
  Math.round(Number(item.unitPrice) * 100) * (Number(item.quantity) || 0) / 100

// Turns an API error into text for the user.
export function ordersErrorMessage(error) {
  if (!error || !error.status) return 'Could not reach the server. Please try again.'
  if (error.status === 401) return 'Your session has expired. Please log in again.'
  return 'Your orders could not be loaded. Please try again later.'
}

// ---------- Order status (Jira DP-54) ----------
// The database stores 'in_transit'; the user sees "In transit".
export const STATUS_STEPS = ['processing', 'in_transit', 'delivered']

const STATUS_INFO = {
  processing: { label: 'Processing', text: 'We are preparing your order.', color: '#8a6a12', background: '#fbf1d6' },
  in_transit: { label: 'In transit', text: 'Your order is on its way.', color: '#2d5f86', background: '#e3eef7' },
  delivered: { label: 'Delivered', text: 'Your order has been delivered.', color: 'var(--primary-dark)', background: 'var(--soft)' },
  cancelled: { label: 'Cancelled', text: 'This order was cancelled.', color: 'var(--danger)', background: '#f8e3e0' },
}

// Label, short text and colours for a status. Unknown values are shown as they are.
export function statusInfo(status) {
  return STATUS_INFO[status] ?? { label: String(status ?? 'Unknown'), text: '', color: 'var(--muted)', background: 'var(--line)' }
}

// How far the order has come: 0 = processing, 1 = in transit, 2 = delivered, -1 = not on the path (cancelled/unknown).
export const statusStepIndex = (status) => STATUS_STEPS.indexOf(status)
