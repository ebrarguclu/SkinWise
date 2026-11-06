import { useEffect, useState } from 'react'
import { fetchCategories } from '../api/categories.js'

// Categories come from the database through GET /categories.
export function useCategories() {
  const [state, setState] = useState({ categories: [], loading: true, error: null })

  useEffect(() => {
    let ignore = false
    fetchCategories()
      .then((categories) => { if (!ignore) setState({ categories, loading: false, error: null }) })
      .catch((error) => { if (!ignore) setState({ categories: [], loading: false, error }) })
    return () => { ignore = true }
  }, [])

  return state
}
