import { useSearchParams } from 'react-router-dom'
import { categories, getProducts } from '../data/products.js'
import ProductCard from '../components/ProductCard.jsx'
import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'

// TEMPORARY: will be connected to the backend when Safiye's catalog/search/sort work is done.
export default function Products() {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') || '').toLowerCase()
  const category = params.get('category') || ''
  const sort = params.get('sort') || ''

  let list = getProducts().filter((p) =>
    (!category || p.category === category) &&
    (!q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q))
  )
  if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
  if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
  if (sort === 'popular') list = [...list].sort((a, b) => b.rating - a.rating)

  const set = (key, value) => {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    setParams(next)
  }

  return (
    <>
      <PageHeader title="Shop" subtitle={`${list.length} ${list.length === 1 ? 'product' : 'products'} found`}>
        <div className="row gap-s wrap">
          <select value={category} onChange={(e) => set('category', e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort">
            <option value="">Sort by</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="popular">Popularity</option>
          </select>
        </div>
      </PageHeader>

      {list.length === 0 ? (
        <EmptyState icon="🔍" title="No products found" text="Try changing your search or filters." actionLabel="Show all products" actionTo="/products" />
      ) : (
        <div className="grid">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      )}
    </>
  )
}
