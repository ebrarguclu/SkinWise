import { useEffect, useState } from 'react'
import { fetchProducts } from '../api/products.js'

export function useProducts() {
  const [state, setState] = useState({ products: [], loading: true, error: null })

  useEffect(() => {
    let ignore = false
    fetchProducts()
      .then((products) => { if (!ignore) setState({ products, loading: false, error: null }) })
      .catch((error) => { if (!ignore) setState({ products: [], loading: false, error }) })
    return () => { ignore = true }
  }, [])

  return state
}
