import { useEffect, useState } from 'react'
import { fetchProducts } from '../api/products.js'

// Loads products from the backend.
// useProducts()                                   -> all products        (GET /products)
// useProducts('serum')                            -> one category only   (GET /products?category=serum)
// useProducts('', { q: 'rice', sort: 'popular' }) -> search + sort       (GET /products?q=rice&sort=popular)
// Searching and sorting happen on the backend. When any of them changes, the list is fetched again.
export function useProducts(category = '', { q = '', sort = '' } = {}) {
  const [state, setState] = useState({ products: [], loading: true, error: null })

  useEffect(() => {
    let ignore = false // ignores an old answer if the user already changed the category, search or sort
    setState((prev) => ({ ...prev, loading: true, error: null }))

    fetchProducts(category, { q, sort })
      .then((products) => { if (!ignore) setState({ products, loading: false, error: null }) })
      .catch((error) => { if (!ignore) setState({ products: [], loading: false, error }) })

    return () => { ignore = true }
  }, [category, q, sort])

  return state
}
