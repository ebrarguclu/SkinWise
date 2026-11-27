// Unit tests for the stock messages added in Sprint 3 (bug fixes on the cart).
import { describe, expect, test } from 'vitest'
import {
  addButtonState, cartProblems, lineStatus, quantityInCart, refreshGuestItems,
} from './cart.js'
import { MAX_TOASTS, addToast } from './toasts.js'

const line = (over) => ({ id: 1, name: 'Serum', price: 10, stock: 3, qty: 1, ...over })

describe('quantityInCart', () => {
  test('returns the quantity of the product in the cart', () => {
    expect(quantityInCart([line({ id: 1, qty: 2 }), line({ id: 2, qty: 5 })], 2)).toBe(5)
  })
  test('returns 0 when the product is not in the cart or the cart is empty', () => {
    expect(quantityInCart([line({ id: 1 })], 9)).toBe(0)
    expect(quantityInCart(undefined, 1)).toBe(0)
  })
})

describe('addButtonState (Add to cart button)', () => {
  test('normal button while there is stock left', () => {
    expect(addButtonState({ stock: 3 }, 2)).toEqual({ disabled: false, label: 'Add to cart', full: false })
  })
  test('turned off with a clear label when the whole stock is in the cart', () => {
    expect(addButtonState({ stock: 3 }, 3)).toEqual({ disabled: true, label: '✓ All 3 in your cart', full: true })
  })
  test('says "the last one" when only one was in stock', () => {
    expect(addButtonState({ stock: 1 }, 1).label).toBe('✓ The last one is in your cart')
  })
  test('out of stock products say "Out of stock", also with missing stock data', () => {
    expect(addButtonState({ stock: 0 }, 0)).toEqual({ disabled: true, label: 'Out of stock', full: false })
    expect(addButtonState({}, 0).label).toBe('Out of stock')
  })
})

describe('lineStatus (note under a cart line)', () => {
  test('no note while the quantity is below the stock', () => {
    expect(lineStatus(line({ qty: 2, stock: 3 }))).toBeNull()
  })
  test('"max" when the whole stock is in the cart', () => {
    expect(lineStatus(line({ qty: 3, stock: 3 }))).toEqual({ level: 'max', text: 'You have all 3 in stock' })
  })
  test('"over" when the stock dropped below the quantity in the cart', () => {
    expect(lineStatus(line({ qty: 4, stock: 1 })).level).toBe('over')
    expect(lineStatus(line({ qty: 4, stock: 1 })).text).toBe('Only 1 left. Please lower the quantity.')
  })
  test('"out" when the product has no stock any more', () => {
    expect(lineStatus(line({ qty: 1, stock: 0 })).level).toBe('out')
  })
})

describe('cartProblems (blocks checkout)', () => {
  test('lists only the lines that are out of stock or above the stock', () => {
    const items = [line({ id: 1, qty: 3, stock: 3 }), line({ id: 2, qty: 5, stock: 2 }), line({ id: 3, qty: 1, stock: 0 })]
    expect(cartProblems(items).map((i) => i.id)).toEqual([2, 3])
  })
  test('an ordinary cart has no problems', () => {
    expect(cartProblems([line({ qty: 1, stock: 3 })])).toEqual([])
    expect(cartProblems()).toEqual([])
  })
})

describe('refreshGuestItems (guest cart gets the current price and stock)', () => {
  test('updates the price and stock from the product list', () => {
    const items = [line({ id: 1, price: 5, stock: 10, qty: 4 })]
    const [updated] = refreshGuestItems(items, [{ id: 1, price: '9.99', stock: 1 }])
    expect(updated).toMatchObject({ id: 1, price: 9.99, stock: 1, qty: 4 })
  })
  test('a product that is no longer sold gets stock 0, so the cart asks to remove it', () => {
    const [updated] = refreshGuestItems([line({ id: 7 })], [{ id: 1, price: 10, stock: 3 }])
    expect(updated.stock).toBe(0)
    expect(lineStatus(updated).level).toBe('out')
  })
  test('returns the same list when nothing changed (no extra React render)', () => {
    const items = [line({ id: 1, price: 10, stock: 3 })]
    expect(refreshGuestItems(items, [{ id: 1, price: 10, stock: 3 }])).toBe(items)
  })
  test('never changes the list it was given', () => {
    const items = [line({ id: 1, price: 5 })]
    refreshGuestItems(items, [{ id: 1, price: 8, stock: 3 }])
    expect(items[0].price).toBe(5)
  })
})

describe('addToast (toasts do not pile up)', () => {
  const t = (id, message, type = 'error') => ({ id, type, message })
  test('the same message again replaces the old one instead of stacking', () => {
    const list = addToast([t(1, 'You already have all 3 in your cart')], t(2, 'You already have all 3 in your cart'))
    expect(list).toEqual([t(2, 'You already have all 3 in your cart')])
  })
  test(`shows at most ${MAX_TOASTS}; the oldest goes first`, () => {
    let list = []
    for (let i = 1; i <= 5; i += 1) list = addToast(list, t(i, `message ${i}`))
    expect(list.map((x) => x.id)).toEqual([3, 4, 5])
  })
  test('the same text with a different type is a different toast', () => {
    expect(addToast([t(1, 'Saved', 'info')], t(2, 'Saved', 'success'))).toHaveLength(2)
  })
})
