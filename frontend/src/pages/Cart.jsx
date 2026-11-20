import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { formatPrice } from '../data/products.js'
import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'

export default function Cart() {
  const { items, setQty, remove, total, ready, updating, loggedIn } = useCart()
  const toast = useToast()
  const navigate = useNavigate()

  // Requirement 4: anyone can fill a cart, but placing an order needs an account.
  // After logging in the user comes back to checkout and the cart is kept.
  const checkout = () => {
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
          {items.map((i) => (
            <div key={i.id} className="card cart-row">
              <div className="cart-emoji">{i.emoji}</div>
              <div className="grow">
                <Link to={`/products/${i.id}`} className="product-name">{i.name}</Link>
                <div className="muted">{formatPrice(i.price)}{i.qty >= i.stock && ` · only ${i.stock} in stock`}</div>
              </div>
              <div className="qty">
                <button onClick={() => setQty(i.id, i.qty - 1)} aria-label="Decrease" disabled={updating || i.qty <= 1}>−</button>
                <span>{i.qty}</span>
                <button onClick={() => setQty(i.id, i.qty + 1)} aria-label="Increase"
                  disabled={updating || i.qty >= i.stock} title={i.qty >= i.stock ? `Only ${i.stock} in stock` : undefined}>+</button>
              </div>
              <strong>{formatPrice(i.price * i.qty)}</strong>
              <button className="btn-icon" aria-label="Remove" disabled={updating}
                onClick={async () => { await remove(i.id); toast.info('Item removed from cart') }}>🗑</button>
            </div>
          ))}
        </div>
        <aside className="card pad summary">
          <h3>Order summary</h3>
          <div className="row between"><span>Subtotal</span><span>{formatPrice(total)}</span></div>
          <div className="row between"><span>Shipping</span><span>Free</span></div>
          <hr />
          <div className="row between"><strong>Total</strong><strong>{formatPrice(total)}</strong></div>
          <button className="btn btn-primary btn-block" onClick={checkout} disabled={updating}>Proceed to checkout</button>
          {!loggedIn && <p className="muted center-text">You'll be asked to log in before paying.</p>}
        </aside>
      </div>
    </>
  )
}
