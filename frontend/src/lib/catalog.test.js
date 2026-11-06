import { describe, expect, test } from 'vitest'
import { productsPath } from '../api/products.js'
import { stockLabel } from './stock.js'

describe('productsPath', () => {
  test('asks for all products when no category is selected', () => {
    expect(productsPath()).toBe('/products')
    expect(productsPath('')).toBe('/products')
  })

  test('adds the category slug as a query parameter', () => {
    expect(productsPath('serum')).toBe('/products?category=serum')
  })

  test('encodes characters that are not safe in a URL', () => {
    expect(productsPath('a&b')).toBe('/products?category=a%26b')
  })
})

describe('stockLabel', () => {
  test('shows "Out of stock" when nothing is left', () => {
    expect(stockLabel(0)).toBe('Out of stock')
    expect(stockLabel(undefined)).toBe('Out of stock')
  })

  test('warns when only a few items are left', () => {
    expect(stockLabel(1)).toBe('Only 1 left')
    expect(stockLabel(5)).toBe('Only 5 left')
  })

  test('shows the number in stock otherwise', () => {
    expect(stockLabel(24)).toBe('24 in stock')
  })
})
