// Text shown on product cards for the number in stock (requirement #3).
export const LOW_STOCK_LIMIT = 5

export function stockLabel(stock) {
  const n = Number(stock) || 0
  if (n <= 0) return 'Out of stock'
  if (n <= LOW_STOCK_LIMIT) return `Only ${n} left`
  return `${n} in stock`
}
