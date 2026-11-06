import { request } from './client.js'

// Builds the backend path for the product list.
// productsPath()         -> '/products'                  (all products)
// productsPath('serum')  -> '/products?category=serum'   (one category, by slug)
export function productsPath(category) {
  return category ? `/products?category=${encodeURIComponent(category)}` : '/products'
}

// GET /products or GET /products?category=<slug>
export const fetchProducts = (category) => request(productsPath(category))

// Returns null when the product does not exist.
export async function fetchProduct(id) {
  try {
    return await request(`/products/${encodeURIComponent(id)}`)
  } catch (error) {
    if (error.status === 404) return null
    throw error
  }
}
