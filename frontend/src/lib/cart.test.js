import { describe, expect, test } from 'vitest'
import {
  CART_STORAGE_KEY, addItem, addToCartMessage, cartCount, cartTotal,
  loadCart, removeItem, saveCart, setItemQuantity,
} from './cart.js'

const serum = { id: 3, name: 'Niacinamide 10% Serum', price: 17.99, stock: 5, emoji: '✨' }
const mask = { id: 5, name: 'Clay Detox Mask', price: 9.99, stock: 0, emoji: '🌿' }
const cream = { id: 2, name: 'Barrier Cream', price: 19.99, stock: 12, emoji: '💧' }

// A tiny in-memory stand-in for window.localStorage
function fakeStorage(initial = {}) {
  const data = { ...initial }
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v) },
    data,
  }
}

describe('addItem', () => {
  test('adds a new product with quantity 1', () => {
    const { items, added, reason } = addItem([], serum)
    expect(items).toEqual([{ id: 3, name: serum.name, price: 17.99, emoji: '✨', stock: 5, qty: 1 }])
    expect(added).toBe(1)
    expect(reason).toBeNull()
  })

  test('adding the same product again increases its quantity instead of adding it twice', () => {
    const first = addItem([], serum).items
    const { items } = addItem(first, serum)
    expect(items).toHaveLength(1)
    expect(items[0].qty).toBe(2)
  })

  test('an out-of-stock product cannot be added', () => {
    const { items, added, reason } = addItem([], mask)
    expect(items).toEqual([])
    expect(added).toBe(0)
    expect(reason).toBe('out_of_stock')
  })

  test('quantity cannot go above the stock', () => {
    let items = []
    for (let n = 0; n < 7; n++) items = addItem(items, serum).items
    expect(items[0].qty).toBe(5)
  })

  test('adding more than the remaining stock adds only what is left', () => {
    const start = addItem([], serum, 3).items
    const { items, added, reason } = addItem(start, serum, 4)
    expect(items[0].qty).toBe(5)
    expect(added).toBe(2)
    expect(reason).toBe('stock_limit')
  })

  test('nothing is added when the whole stock is already in the cart', () => {
    const full = addItem([], serum, 5).items
    const { items, added, reason } = addItem(full, serum)
    expect(items).toBe(full)
    expect(added).toBe(0)
    expect(reason).toBe('stock_limit')
  })

  test('the cart item takes the latest price and stock of the product', () => {
    const start = addItem([], serum).items
    const { items } = addItem(start, { ...serum, price: 15, stock: 9 })
    expect(items[0]).toMatchObject({ price: 15, stock: 9, qty: 2 })
  })

  test('a price that arrives as text from the API is stored as a number', () => {
    const { items } = addItem([], { ...serum, price: '17.99' })
    expect(items[0].price).toBe(17.99)
  })

  test('zero, negative or broken quantities are ignored', () => {
    expect(addItem([], serum, 0).added).toBe(0)
    expect(addItem([], serum, -2).added).toBe(0)
    expect(addItem([], serum, 1.5).added).toBe(0)
    expect(addItem([], null).items).toEqual([])
  })

  test('does not change the list it was given', () => {
    const start = addItem([], serum).items
    const copy = structuredClone(start)
    addItem(start, serum)
    expect(start).toEqual(copy)
  })

  test('other products in the cart are left as they are', () => {
    const start = addItem(addItem([], cream).items, serum).items
    const { items } = addItem(start, serum)
    expect(items.map((i) => [i.id, i.qty])).toEqual([[2, 1], [3, 2]])
  })
})

describe('setItemQuantity', () => {
  const items = addItem([], serum, 2).items

  test('sets a quantity inside the allowed range', () => {
    expect(setItemQuantity(items, 3, 4)[0].qty).toBe(4)
  })

  test('never goes above the stock', () => {
    expect(setItemQuantity(items, 3, 99)[0].qty).toBe(5)
  })

  test('never goes below 1 (use remove to take a product out)', () => {
    expect(setItemQuantity(items, 3, 0)[0].qty).toBe(1)
    expect(setItemQuantity(items, 3, -4)[0].qty).toBe(1)
  })
})

describe('removeItem, cartCount and cartTotal', () => {
  const items = addItem(addItem([], serum, 2).items, cream, 1).items

  test('removeItem takes only that product out', () => {
    expect(removeItem(items, 3).map((i) => i.id)).toEqual([2])
  })

  test('cartCount is the total number of pieces (shown on the navbar icon)', () => {
    expect(cartCount(items)).toBe(3)
    expect(cartCount([])).toBe(0)
  })

  test('cartTotal is rounded to cents', () => {
    expect(cartTotal(items)).toBe(55.97)
    const floaty = [{ id: 1, price: 0.1, qty: 1 }, { id: 2, price: 0.2, qty: 1 }]
    expect(cartTotal(floaty)).toBe(0.3)
  })
})

describe('saving the cart in the browser', () => {
  test('a saved cart is loaded again after a page refresh', () => {
    const storage = fakeStorage()
    const items = addItem([], serum, 2).items
    saveCart(storage, items)
    expect(loadCart(storage)).toEqual(items)
  })

  test('an empty browser starts with an empty cart', () => {
    expect(loadCart(fakeStorage())).toEqual([])
  })

  test('broken JSON in storage gives an empty cart instead of a crash', () => {
    expect(loadCart(fakeStorage({ [CART_STORAGE_KEY]: '{not json' }))).toEqual([])
  })

  test('items with a broken quantity or price are dropped', () => {
    const saved = JSON.stringify([
      { id: 1, name: 'ok', price: 5, stock: 3, qty: 1 },
      { id: 2, name: 'zero qty', price: 5, stock: 3, qty: 0 },
      { id: 3, name: 'text price', price: '5', stock: 3, qty: 1 },
      null,
    ])
    expect(loadCart(fakeStorage({ [CART_STORAGE_KEY]: saved })).map((i) => i.id)).toEqual([1])
  })

  test('saving does not crash when storage is full or blocked', () => {
    const blocked = { setItem: () => { throw new Error('QuotaExceededError') } }
    expect(() => saveCart(blocked, [])).not.toThrow()
  })
})

describe('addToCartMessage', () => {
  test('success message after a normal add', () => {
    expect(addToCartMessage(serum, { added: 1, reason: null }))
      .toEqual({ type: 'success', text: 'Niacinamide 10% Serum added to cart' })
  })

  test('error message for an out-of-stock product', () => {
    expect(addToCartMessage(mask, { added: 0, reason: 'out_of_stock' }).type).toBe('error')
  })

  test('tells the user when the whole stock is already in the cart', () => {
    expect(addToCartMessage(serum, { added: 0, reason: 'stock_limit' }).text)
      .toBe('You already have all 5 in your cart')
  })
})
