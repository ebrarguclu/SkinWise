import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { StatusBadge, StatusSteps } from '../components/OrderStatus.jsx'
import { fetchMyOrders } from '../api/orders.js'
import { formatPrice } from '../data/products.js'
import { formatOrderDate, itemCountLabel, lineTotal, ordersErrorMessage, sortNewestFirst } from '../lib/orders.js'

// Order history (Jira DP-53): the user's orders, newest first,
// each with its date, products and total, and its status (Jira DP-54).
export default function Orders() {
  const [{ orders, loading, error }, setState] = useState({ orders: [], loading: true, error: null })

  useEffect(() => {
    let ignore = false
    fetchMyOrders()
      .then((data) => { if (!ignore) setState({ orders: sortNewestFirst(data), loading: false, error: null }) })
      .catch((err) => { if (!ignore) setState({ orders: [], loading: false, error: err }) })
    return () => { ignore = true }
  }, [])

  if (loading) {
    return (
      <>
        <PageHeader title="My Orders" />
        <p className="muted">Loading your orders…</p>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="My Orders" />
        <EmptyState icon="⚠️" title="Orders could not be loaded" text={ordersErrorMessage(error)} actionLabel="Back to shop" actionTo="/products" />
      </>
    )
  }

  if (orders.length === 0) {
    return (
      <>
        <PageHeader title="My Orders" />
        <EmptyState icon="📦" title="You have no orders yet" text="When you place an order, it will appear here." actionLabel="Start shopping" actionTo="/products" />
      </>
    )
  }

  return (
    <>
      <PageHeader title="My Orders" subtitle={`${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`} />
      <div className="stack">
        {orders.map((order) => (
          <article key={order.id} className="card pad">
            <div className="row between center wrap gap-s">
              <div>
                <div className="row center gap-s wrap">
                  <h3 style={{ margin: 0 }}>Order #{order.id}</h3>
                  <StatusBadge status={order.status} />
                </div>
                <small className="muted">{formatOrderDate(order.createdAt)} · {itemCountLabel(order)}</small>
              </div>
              <strong style={{ fontSize: '1.15rem' }}>{formatPrice(order.totalAmount)}</strong>
            </div>
            <StatusSteps status={order.status} />
            <hr />
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '.6rem' }}>
              {order.items.map((item) => (
                <li key={item.productId} className="row between center gap">
                  <div className="row center gap" style={{ minWidth: 0 }}>
                    <div style={{ width: 48, height: 48, flex: 'none', borderRadius: 10, overflow: 'hidden', background: 'var(--soft)', display: 'grid', placeItems: 'center', fontSize: '1.4rem' }}>
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span>{item.emoji ?? '🧴'}</span>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <Link to={`/products/${item.productId}`} className="link">{item.name}</Link>
                      <small className="muted block">{item.quantity} × {formatPrice(item.unitPrice)}</small>
                    </div>
                  </div>
                  <span>{formatPrice(lineTotal(item))}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  )
}
