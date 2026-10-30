import { Link, useParams } from 'react-router-dom'
import { formatPrice, getProduct } from '../data/products.js'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import EmptyState from '../components/EmptyState.jsx'

// TEMPORARY: Mehlika's product page work (reviews, ratings) will be added here.
export default function ProductDetail() {
  const { id } = useParams()
  const product = getProduct(id)
  const { add } = useCart()
  const toast = useToast()

  if (!product) return <EmptyState icon="❓" title="Product not found" actionLabel="Back to shop" actionTo="/products" />
  const soldOut = product.stock === 0

  return (
    <div className="detail">
      <div className="detail-img card">{product.emoji}</div>
      <div>
        <Link to="/products" className="link">← Back to shop</Link>
        <small className="muted block">{product.brand}</small>
        <h1>{product.name}</h1>
        <p className="muted">★ {product.rating} · Suitable for {product.skin.toLowerCase()} skin</p>
        <div className="row gap-s wrap">{product.badges.map((b) => <span key={b} className="tag">{b}</span>)}</div>
        <p className="price">{formatPrice(product.price)}</p>
        <p className={soldOut ? 'stock out' : 'stock'}>
          {soldOut ? 'Out of stock' : `${product.stock} in stock`}
        </p>
        <button className="btn btn-primary" disabled={soldOut}
          onClick={() => { add(product); toast.success('Added to cart') }}>
          {soldOut ? 'Out of stock' : 'Add to cart'}
        </button>
        <div className="card pad mt">
          <h3>Reviews</h3>
          <p className="muted">The ratings and comments section will be added here as part of Mehlika's tasks.</p>
        </div>
      </div>
    </div>
  )
}
