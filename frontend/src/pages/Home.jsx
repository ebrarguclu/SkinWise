import { Link } from 'react-router-dom'
import { useCategories } from '../hooks/useCategories.js'
import { useProducts } from '../hooks/useProducts.js'
import ProductCard from '../components/ProductCard.jsx'
import Button from '../components/Button.jsx'
import Loader from '../components/Loader.jsx'
import ErrorMessage from '../components/ErrorMessage.jsx'
import EmptyState from '../components/EmptyState.jsx'

const FEATURED_COUNT = 4

// Top products by rating. Ratings come from real reviews, so a fixed
// "rating >= 4.6" filter would leave this section empty until people review.
// In-stock products come first so the home page does not open with "Sold out" cards.
export function pickFeatured(products, count = FEATURED_COUNT) {
  return [...products]
    .sort((a, b) => (b.stock > 0) - (a.stock > 0) || b.rating - a.rating)
    .slice(0, count)
}

export default function Home() {
  const { products, loading, error } = useProducts()
  const categories = useCategories()
  const featured = pickFeatured(products)

  return (
    <>
      <section className="hero">
        <div>
          <span className="tag">Shopping made for your skin</span>
          <h1>Find the right product <em>without guessing.</em></h1>
          <p>Take a short skin quiz and SkinWise will mark every product for your skin type, sensitivity and concerns.</p>
          <div className="row gap wrap">
            <Button to="/register">Take the skin quiz</Button>
            <Button to="/products" variant="outline">Explore products</Button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">🧴</div>
      </section>

      <section className="section" aria-labelledby="home-categories">
        <h2 id="home-categories">Shop by category</h2>
        {categories.loading && <Loader label="Loading categories…" />}
        {categories.error && (
          <ErrorMessage title="Categories could not be loaded" message="Please refresh the page or try again later." />
        )}
        {!categories.loading && !categories.error && (
          <ul className="cat-grid" role="list">
            {categories.categories.map((c) => (
              <li key={c.id}>
                <Link to={`/products?category=${encodeURIComponent(c.slug)}`} className="cat-item">
                  <span aria-hidden="true">{c.icon}</span>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section" aria-labelledby="home-featured">
        <div className="row between center wrap gap-s">
          <h2 id="home-featured">Featured products</h2>
          <Link to="/products" className="link">View all →</Link>
        </div>
        {loading && <Loader label="Loading products…" />}
        {error && (
          <ErrorMessage title="Products could not be loaded" message="Please refresh the page or try again later." />
        )}
        {!loading && !error && featured.length === 0 && (
          <EmptyState icon="🧴" title="No products yet" text="New products will appear here soon." />
        )}
        {featured.length > 0 && (
          <div className="grid">
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      <section className="section picked">
        <h2>Picked for you</h2>
        <p>Log in and finish your skin quiz to see personal recommendations here.</p>
        <Button to="/login">Log in</Button>
      </section>

      <section className="section">
        <div className="features">
          <div className="card pad"><h3>🎯 Personal badges</h3><p>Labels like "suits your skin" or "caution for sensitive skin".</p></div>
          <div className="card pad"><h3>🔎 Smart filters</h3><p>Filter by skin type, concern, ingredient, vegan and fragrance-free.</p></div>
          <div className="card pad"><h3>⭐ Reviews by skin type</h3><p>Read reviews only from people with your skin type.</p></div>
        </div>
      </section>
    </>
  )
}
