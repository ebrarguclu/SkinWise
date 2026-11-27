import { useSearchParams } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts.js'
import { useCategories } from '../hooks/useCategories.js'
import { resultsText, SORT_OPTIONS } from '../lib/search.js'
import ProductCard from '../components/ProductCard.jsx'
import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import './Products.css'

// Product list and search results page (Jira: Safiye, Catalog & Search).
// Everything the customer picks lives in the URL, so the page can be shared or refreshed
// and the navbar search and home page category links open the right list:
//   /products?category=serum            products of one category
//   /products?q=vitamin c               search results (name, description or brand)
//   /products?q=rice&sort=price-asc     search results, cheapest first
// Filtering, searching and sorting are all done by the backend: GET /products?category=&q=&sort=
// Sold-out products are shown in the results, but ProductCard does not let them be added to the cart.
export default function Products() {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') || '').trim()
  const category = params.get('category') || ''
  const sort = params.get('sort') || ''

  const { products, loading, error } = useProducts(category, { q, sort })
  const { categories } = useCategories()
  const current = categories.find((c) => c.slug === category)

  const set = (key, value) => {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    setParams(next)
  }

  const search = (e) => {
    e.preventDefault()
    set('q', new FormData(e.currentTarget).get('q').trim())
  }

  const title = q ? 'Search results' : current ? current.name : 'Shop'
  const subtitle = loading || error ? '' : resultsText(products.length, q, current?.name)

  return (
    <>
      <PageHeader title={title} subtitle={subtitle}>
        <div className="list-tools">
          {/* key={q}: the box shows the new text when the search changes from the navbar */}
          <form key={q} className="page-search" role="search" onSubmit={search}>
            <input name="q" type="search" defaultValue={q} maxLength={100} placeholder="Search by name or description" aria-label="Search products" />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
          <select value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </PageHeader>

      {q && (
        <p className="search-note">
          <button type="button" className="link-btn" onClick={() => set('q', '')}>✕ Clear search</button>
        </p>
      )}

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
        <EmptyState icon="⚠️" title="Products could not be loaded" text={error.status === 400 ? error.message : 'Please try again later.'} actionLabel="Show all products" actionTo="/products" />
      ) : products.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={q ? `No results for “${q}”` : 'No products found'}
          text={q
            ? 'Check the spelling, try fewer words or search in all categories.'
            : current ? `There are no products in ${current.name} yet.` : 'Try another category.'}
          actionLabel="Show all products"
          actionTo="/products"
        />
      ) : (
        <div className="grid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      )}
    </>
  )
}
