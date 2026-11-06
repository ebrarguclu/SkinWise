// Guest cart rules (Jira DP-14). Pure functions: they never change the list
// they are given, they return a new one. This keeps them easy to unit test
// and lets CartContext stay a thin wrapper around React state + localStorage.

export const CART_STORAGE_KEY = 'sw_cart'

const isPositiveInt = (n) => Number.isInteger(n) && n > 0

// Reads the cart saved in the browser. Broken or edited data is ignored
// instead of crashing the whole site.
export function loadCart(storage) {
  try {
    const saved = JSON.parse(storage.getItem(CART_STORAGE_KEY))
    if (!Array.isArray(saved)) return []
    return saved.filter((i) =>
      i && i.id != null && isPositiveInt(i.qty) && typeof i.price === 'number' && Number.isInteger(i.stock)
    )
  } catch {
    return []
  }
}

export function saveCart(storage, items) {
  try {
    storage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // storage full or blocked (private mode): the cart still works for this visit
  }
}

// Only the fields the cart page needs are kept, with the latest price and stock.
const toCartItem = (product, qty) => ({
  id: product.id,
  name: product.name,
  price: Number(product.price),
  emoji: product.emoji,
  stock: product.stock,
  qty,
})

// Adds a product. Returns { items, added, reason }:
//   added  = how many were really added (can be less than asked)
//   reason = null | 'out_of_stock' | 'stock_limit'
export function addItem(items, product, qty = 1) {
  if (!product || !isPositiveInt(qty)) return { items, added: 0, reason: null }
  if (!(product.stock > 0)) return { items, added: 0, reason: 'out_of_stock' }

  const existing = items.find((i) => i.id === product.id)
  const inCart = existing ? existing.qty : 0
  const room = Math.max(product.stock - inCart, 0)
  const added = Math.min(qty, room)
  const reason = added < qty ? 'stock_limit' : null

  if (added === 0) return { items, added, reason }

  const updated = toCartItem(product, inCart + added)
  const next = existing
    ? items.map((i) => (i.id === product.id ? updated : i)) // same product: quantity goes up
    : [...items, updated]
  return { items: next, added, reason }
}

// Sets a quantity between 1 and the stock.
export function setItemQuantity(items, id, qty) {
  return items.map((i) =>
    i.id === id ? { ...i, qty: Math.max(1, Math.min(Math.floor(qty) || 1, i.stock)) } : i
  )
}

export const removeItem = (items, id) => items.filter((i) => i.id !== id)

export const cartCount = (items) => items.reduce((sum, i) => sum + i.qty, 0)

// Rounded to cents so 0.1 + 0.2 style float errors never reach the screen.
export const cartTotal = (items) =>
  Math.round(items.reduce((sum, i) => sum + i.qty * i.price, 0) * 100) / 100

// The toast shown after "Add to cart". Kept here so the product list and the
// product page always say the same thing.
export function addToCartMessage(product, { added, reason }) {
  if (reason === 'out_of_stock') return { type: 'error', text: `${product.name} is out of stock` }
  if (added === 0) return { type: 'error', text: `You already have all ${product.stock} in your cart` }
  if (reason === 'stock_limit') return { type: 'info', text: `Only ${added} more could be added (${product.stock} in stock)` }
  return { type: 'success', text: `${product.name} added to cart` }
}
