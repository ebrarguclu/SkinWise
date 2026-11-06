import { useEffect, useState } from 'react'
import { fetchProducts } from '../api/products.js'

// Loads products from the backend.
// useProducts()         -> all products        (GET /products)
// useProducts('serum')  -> one category only   (GET /products?category=serum)
// When the category changes, the list is fetched again.
export function useProducts(category = '') {
  const [state, setState] = useState({ products: [], loading: true, error: null })

  useEffect(() => {
    let ignore = false // ignores an old answer if the user already picked another category
    setState((prev) => ({ ...prev, loading: true, error: null }))

    fetchProducts(category)
      .then((products) => { if (!ignore) setState({ products, loading: false, error: null }) })
      .catch((error) => { if (!ignore) setState({ products: [], loading: false, error }) })

    return () => { ignore = true }
  }, [category])

  return state
}
