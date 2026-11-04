import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { formatPrice } from '../data/products.js'
import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'

export default function Cart() {
  const { items, setQty, remove, total } = useCart()
  const toast = useToast()
  const navigate = useNavigate()

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
                <div className="muted">{formatPrice(i.price)}</div>
              </div>
              <div className="qty">
                <button onClick={() => setQty(i.id, i.qty - 1)} aria-label="Decrease">−</button>
                <span>{i.qty}</span>
                <button onClick={() => setQty(i.id, i.qty + 1)} aria-label="Increase">+</button>
              </div>
              <strong>{formatPrice(i.price * i.qty)}</strong>
              <button className="btn-icon" aria-label="Remove"
                onClick={() => { remove(i.id); toast.info('Item removed from cart') }}>🗑</button>
            </div>
          ))}
        </div>
        <aside className="card pad summary">
          <h3>Order summary</h3>
          <div className="row between"><span>Subtotal</span><span>{formatPrice(total)}</span></div>
          <div className="row between"><span>Shipping</span><span>Free</span></div>
          <hr />
          <div className="row between"><strong>Total</strong><strong>{formatPrice(total)}</strong></div>
          <button className="btn btn-primary btn-block" onClick={() => navigate('/checkout')}>Proceed to checkout</button>
        </aside>
      </div>
    </>
  )
}
