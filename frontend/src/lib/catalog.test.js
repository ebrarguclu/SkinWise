import { describe, expect, test } from 'vitest'
import { productsPath } from '../api/products.js'
import { stockLabel } from './stock.js'
import { resultsText, SORT_OPTIONS } from './search.js'

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

  test('adds the search text and the sort to the backend path', () => {
    expect(productsPath('', { q: 'rice' })).toBe('/products?q=rice')
    expect(productsPath('', { sort: 'price-asc' })).toBe('/products?sort=price-asc')
    expect(productsPath('serum', { q: 'vitamin', sort: 'popular' })).toBe('/products?category=serum&q=vitamin&sort=popular')
  })

  test('trims the search text and leaves out an empty search', () => {
    expect(productsPath('', { q: '  rice  ' })).toBe('/products?q=rice')
    expect(productsPath('', { q: '   ', sort: '' })).toBe('/products')
  })

  test('encodes spaces and symbols in the search text', () => {
    expect(productsPath('', { q: 'vitamin c & e' })).toBe('/products?q=vitamin+c+%26+e')
    expect(productsPath('', { q: 'SPF 50+' })).toBe('/products?q=SPF+50%2B')
  })
})

describe('resultsText', () => {
  test('counts products in singular and plural', () => {
    expect(resultsText(1)).toBe('1 product found')
    expect(resultsText(0)).toBe('0 products found')
    expect(resultsText(12)).toBe('12 products found')
  })

  test('mentions the search text and the category', () => {
    expect(resultsText(3, 'rice')).toBe('3 products found for “rice”')
    expect(resultsText(2, ' rice ', 'Toners')).toBe('2 products found for “rice” in Toners')
    expect(resultsText(5, '', 'Toners')).toBe('5 products found')
  })
})

describe('SORT_OPTIONS', () => {
  test('match the sort values the backend accepts', () => {
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual(['', 'price-asc', 'price-desc', 'popular'])
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
