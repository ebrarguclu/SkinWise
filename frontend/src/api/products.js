import { request } from './client.js'

export const fetchProducts = () => request('/products')

// Returns null when the product does not exist.
export async function fetchProduct(id) {
  try {
    return await request(`/products/${encodeURIComponent(id)}`)
  } catch (error) {
    if (error.status === 404) return null
    throw error
  }
}
