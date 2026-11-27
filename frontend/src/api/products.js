import { request } from './client.js'

// Builds the backend path for the product list.
// productsPath()                                -> '/products'                        (all products)
// productsPath('serum')                         -> '/products?category=serum'         (one category, by slug)
// productsPath('', { q: 'vitamin c' })          -> '/products?q=vitamin+c'            (search)
// productsPath('serum', { sort: 'price-asc' })  -> '/products?category=serum&sort=price-asc'
export function productsPath(category, { q, sort } = {}) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (q && q.trim()) params.set('q', q.trim())
  if (sort) params.set('sort', sort)
  const query = params.toString()
  return query ? `/products?${query}` : '/products'
}

// GET /products with optional ?category=, ?q= (search) and ?sort=
export const fetchProducts = (category, options) => request(productsPath(category, options))

// Returns null when the product does not exist.
export async function fetchProduct(id) {
  try {
    return await request(`/products/${encodeURIComponent(id)}`)
  } catch (error) {
    if (error.status === 404) return null
    throw error
  }
}
