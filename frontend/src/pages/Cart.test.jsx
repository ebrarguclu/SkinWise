// @vitest-environment jsdom
// Component tests: the real Cart page and ProductCard are drawn in a fake browser
// (jsdom) and checked the way a customer sees them. The cart and toast contexts
// are replaced with simple stand-ins so no backend is needed.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const cart = vi.hoisted(() => ({ value: null }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('../context/CartContext.jsx', () => ({ useCart: () => cart.value }))
vi.mock('../context/ToastContext.jsx', () => ({ useToast: () => toast }))

const navigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (load) => ({ ...(await load()), useNavigate: () => navigate }))

import Cart from './Cart.jsx'
import ProductCard from '../components/ProductCard.jsx'

const line = (over) => ({ id: 1, name: 'Vitamin C Serum', price: 20, emoji: '✨', imageUrl: null, stock: 3, qty: 1, ...over })

function useCartWith(items, extra = {}) {
  cart.value = {
    items, ready: true, updating: false, loggedIn: false,
    total: items.reduce((s, i) => s + i.price * i.qty, 0),
    setQty: vi.fn(), remove: vi.fn(), refresh: vi.fn(), add: vi.fn(),
    stockChanges: [], dismissStockChanges: vi.fn(), ...extra,
  }
}

const show = (ui) => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>)

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe('Cart page', () => {
  test('shows a clear note and turns + off when the whole stock is in the cart', () => {
    useCartWith([line({ qty: 3, stock: 3 })])
    show(<Cart />)
    expect(screen.getByText('You have all 3 in stock')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Increase' }).disabled).toBe(true)
  })

  test('says what the cart changed by itself when stock dropped, and the notice can be closed', () => {
    useCartWith([line({ qty: 1, stock: 1 })], {
      stockChanges: [{ id: 1, name: 'Vitamin C Serum', from: 4, to: 1 }, { id: 2, name: 'Clay Mask', from: 1, to: 0 }],
    })
    show(<Cart />)
    const notice = screen.getByRole('status')
    expect(notice.textContent).toContain('Vitamin C Serum: only 1 left, so your quantity is now 1.')
    expect(notice.textContent).toContain('Clay Mask is sold out and was removed.')
    expect(screen.getByRole('button', { name: 'Proceed to checkout' }).disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Close notice' }))
    expect(cart.value.dismissStockChanges).toHaveBeenCalled()
  })

  test('still shows the notice when the only product was sold out and the cart is now empty', () => {
    useCartWith([], { stockChanges: [{ id: 2, name: 'Clay Mask', from: 1, to: 0 }] })
    show(<Cart />)
    expect(screen.getByText('Your cart is empty')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Clay Mask is sold out and was removed.')
  })

  test('fallback: if the cart could not fix itself, checkout stays off and explains why', () => {
    useCartWith([line({ qty: 4, stock: 1 })])
    show(<Cart />)
    expect(screen.getByText('Only 1 left. Please lower the quantity.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Proceed to checkout' }).disabled).toBe(true)
    expect(screen.getByRole('alert').textContent).toContain('1 item needs your attention')
  })

  test('asks for removal when a product is out of stock now', () => {
    useCartWith([line({ qty: 1, stock: 0 }), line({ id: 2, name: 'Toner', qty: 1, stock: 5 })])
    show(<Cart />)
    expect(screen.getByText('Out of stock now. Please remove it to continue.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Vitamin C Serum' }))
    expect(cart.value.remove).toHaveBeenCalledWith(1)
  })

  test('a guest with a normal cart is sent to login before checkout', () => {
    useCartWith([line({ qty: 1, stock: 3 })])
    show(<Cart />)
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to checkout' }))
    expect(navigate).toHaveBeenCalledWith('/login', { state: { from: '/checkout' } })
    expect(toast.info).toHaveBeenCalled()
  })

  test('a logged-in customer goes straight to checkout', () => {
    useCartWith([line({ qty: 1, stock: 3 })], { loggedIn: true })
    show(<Cart />)
    fireEvent.click(screen.getByRole('button', { name: 'Proceed to checkout' }))
    expect(navigate).toHaveBeenCalledWith('/checkout')
  })

  test('loads the current price and stock once when the page opens', () => {
    useCartWith([line()])
    show(<Cart />)
    expect(cart.value.refresh).toHaveBeenCalledTimes(1)
  })
})

describe('ProductCard', () => {
  const product = { id: 1, name: 'Vitamin C Serum', brand: 'GlowLab', price: 20, stock: 3, rating: 4.5, badges: [], emoji: '✨' }

  test('"Add to cart" while there is stock left', () => {
    useCartWith([line({ qty: 2 })])
    show(<ProductCard product={product} />)
    expect(screen.getByRole('button', { name: 'Add to cart' }).disabled).toBe(false)
  })

  test('says "All 3 in your cart" and is turned off when the whole stock is in the cart', () => {
    useCartWith([line({ qty: 3 })])
    show(<ProductCard product={product} />)
    const button = screen.getByRole('button', { name: '✓ All 3 in your cart' })
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(cart.value.add).not.toHaveBeenCalled()
  })

  test('shows a success toast after adding', async () => {
    useCartWith([], { add: vi.fn().mockResolvedValue({ added: 1, reason: null }) })
    show(<ProductCard product={product} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }))
    await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Vitamin C Serum added to cart'))
  })
})
