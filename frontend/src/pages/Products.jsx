import { useSearchParams } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts.js'
import { useCategories } from '../hooks/useCategories.js'
import ProductCard from '../components/ProductCard.jsx'
import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'

// Product list page: browse products by category (Jira: Safiye, Catalog & Search).
// The selected category lives in the URL (/products?category=serum), so links from the
// home page work and the page can be shared or refreshed.
// Filtering by category is done by the backend: GET /products?category=<slug>.
// Search (?q=) and sorting (?sort=) still run in the browser; they move to the backend in Sprint 2.
export default function Products() {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') || '').toLowerCase()
  const category = params.get('category') || ''
  const sort = params.get('sort') || ''

  const { products, loading, error } = useProducts(category)
  const { categories } = useCategories()
  const current = categories.find((c) => c.slug === category)

  let list = products.filter((p) =>
    !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
  )
  if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
  if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
  if (sort === 'popular') list = [...list].sort((a, b) => b.rating - a.rating)

  const set = (key, value) => {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    setParams(next)
  }

  const subtitle = loading || error
    ? ''
    : `${list.length} ${list.length === 1 ? 'product' : 'products'} found`

  return (
    <>
      <PageHeader title={current ? current.name : 'Shop'} subtitle={subtitle}>
        <select value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort">
          <option value="">Sort by</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="popular">Popularity</option>
        </select>
      </PageHeader>

      {/* Category menu: "All" + one button per category from GET /categories */}
      <nav className="cat-menu" aria-label="Product categories">
        <button
          type="button"
          className={`cat-chip${category ? '' : ' active'}`}
          aria-pressed={!category}
          onClick={() => set('category', '')}
        >
          <span aria-hidden="true">🛍️</span> All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`cat-chip${c.slug === category ? ' active' : ''}`}
            aria-pressed={c.slug === category}
            onClick={() => set('category', c.slug)}
          >
            <span aria-hidden="true">{c.icon}</span> {c.name}
          </button>
        ))}
      </nav>

      {loading ? (
        <p className="muted">Loading products…</p>
      ) : error ? (
        <EmptyState icon="⚠️" title="Products could not be loaded" text="Please try again later." actionLabel="Show all products" actionTo="/products" />
      ) : list.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No products found"
          text={current ? `There are no products in ${current.name} yet.` : 'Try changing your search or filters.'}
          actionLabel="Show all products"
          actionTo="/products"
        />
      ) : (
        <div className="grid">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      )}
    </>
  )
}
