import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatPrice } from '../data/products.js'
import { fetchProduct } from '../api/products.js'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import EmptyState from '../components/EmptyState.jsx'

// TEMPORARY: Mehlika's product page work (reviews, ratings) will be added here.
export default function ProductDetail() {
  const { id } = useParams()
  const [{ product, loading, error }, setState] = useState({ product: null, loading: true, error: null })
  const { add } = useCart()
  const toast = useToast()

  useEffect(() => {
    let ignore = false
    setState({ product: null, loading: true, error: null })
    fetchProduct(id)
      .then((product) => { if (!ignore) setState({ product, loading: false, error: null }) })
      .catch((error) => { if (!ignore) setState({ product: null, loading: false, error }) })
    return () => { ignore = true }
  }, [id])

  if (loading) return <p className="muted">Loading product…</p>
  if (error) return <EmptyState icon="⚠️" title="Product could not be loaded" text="Please try again later." actionLabel="Back to shop" actionTo="/products" />
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
