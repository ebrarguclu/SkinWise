const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

async function request(path) {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) {
    const error = new Error(`Request to ${path} failed with status ${res.status}`)
    error.status = res.status
    throw error
  }
  return res.json()
}

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
