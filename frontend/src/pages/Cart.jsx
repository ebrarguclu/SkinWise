import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { formatPrice } from '../data/products.js'
import { cartProblems, lineStatus } from '../lib/cart.js'
import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'

export default function Cart() {
  const { items, setQty, remove, total, ready, updating, loggedIn, refresh } = useCart()
  const toast = useToast()
  const navigate = useNavigate()

  // Load the current price and stock once the cart is ready, because stock can
  // drop after a product was added (someone else bought it).
  const refreshed = useRef(false)
  useEffect(() => {
    if (!ready || refreshed.current) return
    refreshed.current = true
    refresh()
  }, [ready, refresh])

  const problems = cartProblems(items)

  // Requirement 4: anyone can fill a cart, but placing an order needs an account.
  // After logging in the user comes back to checkout and the cart is kept.
  const checkout = () => {
    if (problems.length) return
    if (loggedIn) return navigate('/checkout')
    toast.info('Please log in to place your order. Your cart will be kept.')
    navigate('/login', { state: { from: '/checkout' } })
  }

  if (!ready) return <p className="muted">Loading your cart…</p>

  if (items.length === 0)
    return <EmptyState icon="🛒" title="Your cart is empty" text="Add products you like to your cart to get started." actionLabel="Start shopping" actionTo="/products" />

  return (
    <>
      <PageHeader title="My Cart" subtitle={`${items.length} ${items.length === 1 ? 'item' : 'items'}`} />
      <div className="cart-layout">
        <div className="stack">
          {items.map((i) => {
            const status = lineStatus(i)
            const atMax = i.qty >= i.stock
            return (
              <div key={i.id} className={`card cart-row${status && status.level !== 'max' ? ' cart-row-problem' : ''}`}>
                {/* Product photo; the emoji is shown until a photo is uploaded */}
                <Link to={`/products/${i.id}`} className="cart-emoji" aria-label={i.name}>
                  {i.imageUrl ? <img src={i.imageUrl} alt={i.name} loading="lazy" /> : i.emoji}
                </Link>
                <div className="cart-info">
                  <Link to={`/products/${i.id}`} className="product-name">{i.name}</Link>
                  <div className="muted">{formatPrice(i.price)} each</div>
                  {status && <span className={`stock-note stock-note-${status.level}`}>{status.text}</span>}
                </div>
                <div className="qty" aria-label={`Quantity of ${i.name}`}>
                  <button onClick={() => setQty(i.id, i.qty - 1)} aria-label="Decrease" disabled={updating || i.qty <= 1}>−</button>
                  <span>{i.qty}</span>
                  <button onClick={() => setQty(i.id, i.qty + 1)} aria-label="Increase"
                    disabled={updating || atMax} title={atMax ? `Only ${i.stock} in stock` : undefined}>+</button>
                </div>
                <strong className="cart-line-total">{formatPrice(i.price * i.qty)}</strong>
                <button className="btn-icon cart-remove" aria-label={`Remove ${i.name}`} disabled={updating}
                  onClick={async () => { await remove(i.id); toast.info('Item removed from cart') }}>🗑</button>
              </div>
            )
          })}
        </div>
        <aside className="card pad summary">
          <h3>Order summary</h3>
          <div className="row between"><span>Subtotal</span><span>{formatPrice(total)}</span></div>
          <div className="row between"><span>Shipping</span><span>Free</span></div>
          <hr />
          <div className="row between"><strong>Total</strong><strong>{formatPrice(total)}</strong></div>
          <button className="btn btn-primary btn-block" onClick={checkout} disabled={updating || problems.length > 0}>
            Proceed to checkout
          </button>
          {problems.length > 0
            ? <p className="stock-note stock-note-over center-text" role="alert">
                {problems.length === 1 ? '1 item needs' : `${problems.length} items need`} your attention before checkout.
              </p>
            : !loggedIn && <p className="muted center-text">You'll be asked to log in before paying.</p>}
        </aside>
      </div>
    </>
  )
}
