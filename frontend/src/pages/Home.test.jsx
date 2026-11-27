import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { routerFuture } from '../test/setup.js'
import Home, { pickFeatured } from './Home.jsx'
import { useProducts } from '../hooks/useProducts.js'
import { useCategories } from '../hooks/useCategories.js'

// The home page normally fetches from the backend. Here the hooks return fixed data.
vi.mock('../hooks/useProducts.js', () => ({ useProducts: vi.fn() }))
vi.mock('../hooks/useCategories.js', () => ({ useCategories: vi.fn() }))
// ProductCard has its own cart/toast logic; a stub keeps this test about the home page.
vi.mock('../components/ProductCard.jsx', () => ({
  default: ({ product }) => <article data-testid="product">{product.name}</article>,
}))

const categories = [
  { id: 1, name: 'Serums', slug: 'serum', icon: '✨' },
  { id: 2, name: 'Sunscreens', slug: 'sunscreen', icon: '☀️' },
]
const product = (id, rating, stock = 10) => ({ id, name: `Product ${id}`, rating, stock })

const renderHome = () => render(<MemoryRouter future={routerFuture}><Home /></MemoryRouter>)

beforeEach(() => {
  useCategories.mockReturnValue({ categories, loading: false, error: null })
  useProducts.mockReturnValue({ products: [], loading: false, error: null })
})

describe('Home page', () => {
  test('category cards link to the filtered product list', () => {
    renderHome()
    expect(screen.getByRole('link', { name: /Serums/ })).toHaveAttribute('href', '/products?category=serum')
    expect(screen.getByRole('link', { name: /Sunscreens/ })).toHaveAttribute('href', '/products?category=sunscreen')
  })

  test('shows a loader while products are loading', () => {
    useProducts.mockReturnValue({ products: [], loading: true, error: null })
    renderHome()
    expect(screen.getByRole('status')).toHaveTextContent('Loading products…')
  })

  test('shows an error box when products cannot be loaded', () => {
    useProducts.mockReturnValue({ products: [], loading: false, error: new Error('down') })
    renderHome()
    expect(screen.getByRole('alert')).toHaveTextContent('Products could not be loaded')
  })

  test('shows an error box when categories cannot be loaded', () => {
    useCategories.mockReturnValue({ categories: [], loading: false, error: new Error('down') })
    renderHome()
    expect(screen.getByRole('alert')).toHaveTextContent('Categories could not be loaded')
  })

  test('shows at most 4 featured products', () => {
    useProducts.mockReturnValue({
      products: [1, 2, 3, 4, 5, 6].map((id) => product(id, id)),
      loading: false,
      error: null,
    })
    renderHome()
    const section = screen.getByRole('region', { name: 'Featured products' })
    expect(within(section).getAllByTestId('product')).toHaveLength(4)
  })
})

describe('pickFeatured', () => {
  test('picks the highest rated products first', () => {
    const list = [product(1, 3), product(2, 5), product(3, 4)]
    expect(pickFeatured(list, 2).map((p) => p.id)).toEqual([2, 3])
  })

  test('puts in-stock products before sold-out ones', () => {
    const list = [product(1, 5, 0), product(2, 2, 8)]
    expect(pickFeatured(list).map((p) => p.id)).toEqual([2, 1])
  })

  test('does not change the original list', () => {
    const list = [product(1, 1), product(2, 5)]
    pickFeatured(list)
    expect(list.map((p) => p.id)).toEqual([1, 2])
  })
})
