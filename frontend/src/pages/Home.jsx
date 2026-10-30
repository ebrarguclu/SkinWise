import { Link } from 'react-router-dom'
import { categories, getProducts } from '../data/products.js'
import ProductCard from '../components/ProductCard.jsx'

export default function Home() {
  const featured = getProducts().filter((p) => p.rating >= 4.6).slice(0, 4)

  return (
    <>
      <section className="hero">
        <div>
          <span className="tag">Shopping made for your skin</span>
          <h1>Find the right product <em>without guessing.</em></h1>
          <p>Take a short skin quiz and SkinWise will mark every product for your skin type, sensitivity and concerns.</p>
          <div className="row gap wrap">
            <Link to="/register" className="btn btn-primary">Take the skin quiz</Link>
            <Link to="/products" className="btn btn-outline">Explore products</Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">🧴</div>
      </section>

      <section className="section">
        <h2>Shop by category</h2>
        <div className="cat-grid">
          {categories.map((c) => (
            <Link key={c.id} to={`/products?category=${c.id}`} className="cat-item">
              <span>{c.icon}</span>
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="row between center">
          <h2>Featured products</h2>
          <Link to="/products" className="link">View all →</Link>
        </div>
        <div className="grid">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      <section className="section picked">
        <h2>Picked for you</h2>
        <p>Log in and finish your skin quiz to see personal recommendations here.</p>
        <Link to="/login" className="btn btn-primary">Log in</Link>
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
