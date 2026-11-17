import { describe, expect, test } from 'vitest'
import {
  formatOrderDate, itemCount, itemCountLabel, lineTotal, ordersErrorMessage, sortNewestFirst, statusInfo, statusStepIndex,
} from './orders.js'

const order = (id, createdAt, items = []) => ({ id, createdAt, items })

describe('sortNewestFirst', () => {
  test('puts the newest order first', () => {
    const orders = [
      order(1, '2026-11-01T10:00:00Z'),
      order(3, '2026-11-17T10:00:00Z'),
      order(2, '2026-11-10T10:00:00Z'),
    ]
    expect(sortNewestFirst(orders).map((o) => o.id)).toEqual([3, 2, 1])
  })

  test('does not change the original list', () => {
    const orders = [order(1, '2026-11-01T10:00:00Z'), order(2, '2026-11-10T10:00:00Z')]
    sortNewestFirst(orders)
    expect(orders.map((o) => o.id)).toEqual([1, 2])
  })

  test('returns an empty list for no orders', () => {
    expect(sortNewestFirst([])).toEqual([])
    expect(sortNewestFirst(undefined)).toEqual([])
  })
})

describe('formatOrderDate', () => {
  test('shows day, month, year and time', () => {
    const text = formatOrderDate('2026-11-17T18:05:00Z')
    expect(text).toMatch(/17 Nov 2026/)
    expect(text).toMatch(/\d{2}:\d{2}/)
  })

  test('shows a dash for a missing or invalid date', () => {
    expect(formatOrderDate(undefined)).toBe('—')
    expect(formatOrderDate('not a date')).toBe('—')
  })
})

describe('itemCount and itemCountLabel', () => {
  const twoSerumsOneCream = order(1, '2026-11-17T10:00:00Z', [
    { name: 'Serum', quantity: 2, unitPrice: 22.99 },
    { name: 'Cream', quantity: 1, unitPrice: 16.99 },
  ])

  test('adds up the quantities', () => {
    expect(itemCount(twoSerumsOneCream)).toBe(3)
    expect(itemCountLabel(twoSerumsOneCream)).toBe('3 items')
  })

  test('uses "item" for a single piece', () => {
    expect(itemCountLabel(order(1, '', [{ quantity: 1, unitPrice: 5 }]))).toBe('1 item')
  })

  test('counts 0 for an order without items', () => {
    expect(itemCount(order(1, ''))).toBe(0)
    expect(itemCount(undefined)).toBe(0)
  })
})

describe('lineTotal', () => {
  test('multiplies the price paid by the quantity', () => {
    expect(lineTotal({ unitPrice: 22.99, quantity: 2 })).toBe(45.98)
  })

  test('has no rounding errors', () => {
    expect(lineTotal({ unitPrice: 0.1, quantity: 3 })).toBe(0.3)
  })
})

describe('ordersErrorMessage', () => {
  const apiError = (status) => Object.assign(new Error('x'), { status })

  test('asks the user to log in again after a 401', () => {
    expect(ordersErrorMessage(apiError(401))).toMatch(/log in again/i)
  })

  test('uses a general message for other errors', () => {
    expect(ordersErrorMessage(apiError(500))).toMatch(/could not be loaded/i)
  })

  test('says the server could not be reached for a network error', () => {
    expect(ordersErrorMessage(new TypeError('Failed to fetch'))).toMatch(/could not reach/i)
  })
})

describe('statusInfo', () => {
  test('has a label for each step of an order', () => {
    expect(statusInfo('processing').label).toBe('Processing')
    expect(statusInfo('in_transit').label).toBe('In transit')
    expect(statusInfo('delivered').label).toBe('Delivered')
  })

  test('shows the database value "in_transit" as "In transit"', () => {
    expect(statusInfo('in_transit').label).not.toContain('_')
  })

  test('gives every status its own colour', () => {
    const colours = ['processing', 'in_transit', 'delivered', 'cancelled'].map((s) => statusInfo(s).background)
    expect(new Set(colours).size).toBe(4)
  })

  test('has a label for a cancelled order', () => {
    expect(statusInfo('cancelled').label).toBe('Cancelled')
  })

  test('shows an unknown status as it is instead of breaking', () => {
    expect(statusInfo('returned').label).toBe('returned')
    expect(statusInfo(undefined).label).toBe('Unknown')
  })
})

describe('statusStepIndex', () => {
  test('follows processing → in transit → delivered', () => {
    expect(statusStepIndex('processing')).toBe(0)
    expect(statusStepIndex('in_transit')).toBe(1)
    expect(statusStepIndex('delivered')).toBe(2)
  })

  test('is -1 for statuses that are not on the delivery path', () => {
    expect(statusStepIndex('cancelled')).toBe(-1)
    expect(statusStepIndex(undefined)).toBe(-1)
  })
})
