import { Fragment, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatPrice } from '../data/products.js'
import { fetchProduct } from '../api/products.js'
import { useCart } from '../context/CartContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { addToCartMessage } from '../lib/cart.js'
import EmptyState from '../components/EmptyState.jsx'
import ReviewForm from '../components/ReviewForm.jsx'

// Missing values (null, undefined, empty text) are shown as "—", never "undefined".
const show = (value) => (value === null || value === undefined || value === '' ? '—' : value)

// The discounted price (final_price) is the main price only when it is really lower
// than the normal price; then the normal price is shown struck through next to it.
function priceInfo(product) {
  const price = Number(product.price)
  const finalPrice = Number(product.final_price)
  const hasPrice = product.price != null && Number.isFinite(price)
  const discounted = hasPrice && product.final_price != null && Number.isFinite(finalPrice) && finalPrice < price
  return { hasPrice, discounted, price, finalPrice }
}

// TEMPORARY: Mehlika's product page work (reviews, ratings) will be added here.
export default function ProductDetail() {
  const { id } = useParams()
  const [{ product, loading, error }, setState] = useState({ product: null, loading: true, error: null })
  const [failedImage, setFailedImage] = useState(null) // image_url that could not be loaded
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
  const { hasPrice, discounted, price, finalPrice } = priceInfo(product)
  const showImage = product.image_url && failedImage !== product.image_url
  const category = product.category_name || product.category
  const details = [
    ['Product ID', product.id],
    ['Model', product.model],
    ['Serial number', product.serial_number],
    ['Warranty', product.warranty_status],
    ['Distributor', product.distributor],
  ]

  return (
    <div className="detail">
      <div className="detail-img card">
        {/* Photo if there is one (and it loads); otherwise the emoji */}
        {showImage
          ? <img src={product.image_url} alt={product.name} onError={() => setFailedImage(product.image_url)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          : <span>{product.emoji}</span>}
      </div>
      <div>
        <Link to="/products" className="link">← Back to shop</Link>
        <small className="muted block">{show(product.brand)} · {show(category)}</small>
        <h1>{product.name}</h1>
        <p className="muted">
          ★ {show(product.rating)}{product.skin ? ` · Suitable for ${product.skin.toLowerCase()} skin` : ''}
        </p>
        <div className="row gap-s wrap">{(product.badges ?? []).map((b) => <span key={b} className="tag">{b}</span>)}</div>
        <p>{show(product.description)}</p>
        <p className="price">
          {!hasPrice ? '—' : discounted ? (
            <>
              {formatPrice(finalPrice)}{' '}
              <s className="muted" style={{ fontSize: '1rem', fontWeight: 400 }}>{formatPrice(price)}</s>
            </>
          ) : formatPrice(price)}
        </p>
        <p className={soldOut ? 'stock out' : 'stock'}>
          {soldOut ? 'Out of stock' : `${product.stock} in stock`}
        </p>
        <dl style={{ margin: '1rem 0', display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '.3rem 1rem' }}>
          {details.map(([label, value]) => (
            <Fragment key={label}>
              <dt className="muted">{label}</dt>
              <dd style={{ margin: 0 }}>{show(value)}</dd>
            </Fragment>
          ))}
        </dl>
        <button className="btn btn-primary" disabled={soldOut}
          onClick={() => { const { type, text } = addToCartMessage(product, add(product)); toast[type](text) }}>
          {soldOut ? 'Out of stock' : 'Add to cart'}
        </button>
        <div className="card pad mt">
          <h3>Reviews</h3>
          <ReviewForm productId={product.id} />
        </div>
      </div>
    </div>
  )
}
