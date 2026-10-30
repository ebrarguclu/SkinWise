import { Link } from 'react-router-dom'
import { formatPrice } from '../data/products.js'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function ProductCard({ product }) {
  const { add } = useCart()
  const toast = useToast()
  const soldOut = product.stock === 0

  const handleAdd = () => {
    add(product)
    toast.success(`${product.name} added to cart`)
  }

  return (
    <article className="card product-card">
      <Link to={`/products/${product.id}`} className="product-img" aria-label={product.name}>
        <span>{product.emoji}</span>
        {soldOut && <em className="tag tag-out">Sold out</em>}
      </Link>
      <div className="product-body">
        <small className="muted">{product.brand}</small>
        <Link to={`/products/${product.id}`} className="product-name">{product.name}</Link>
        <div className="row gap-s wrap">
          {product.badges.map((b) => <span key={b} className="tag">{b}</span>)}
        </div>
        <div className="row between center">
          <strong>{formatPrice(product.price)}</strong>
          <span className="muted">★ {product.rating}</span>
        </div>
        <button className="btn btn-primary btn-block" disabled={soldOut} onClick={handleAdd}>
          {soldOut ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </article>
  )
}
