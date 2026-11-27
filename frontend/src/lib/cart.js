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
  imageUrl: product.image_url || product.imageUrl || null, // photo shown on the cart page
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

// ---------------------------------------------------------------------------
// Saved cart of a logged-in user (Sprint 2). The backend keeps it in cart_items;
// these helpers convert between its format and the one the cart pages use.

// Backend line { productId, quantity, ... } -> page line { id, qty, ... }
export const fromServerItems = (items = []) =>
  items.map((i) => ({
    id: i.productId,
    name: i.name,
    price: Number(i.price),
    emoji: i.emoji,
    imageUrl: i.imageUrl,
    stock: i.stock,
    qty: i.quantity,
  }))

// Guest cart -> what POST /cart/merge expects
export const toMergeItems = (items = []) =>
  items.map((i) => ({ productId: i.id, quantity: i.qty }))

// Toast after login when part of the guest cart could not be kept
export function mergeMessage(adjusted = []) {
  if (adjusted.length === 0) return null
  const gone = adjusted.filter((a) => a.quantity === 0).length
  const fewer = adjusted.length - gone
  const parts = []
  if (fewer) parts.push(`${fewer} ${fewer === 1 ? 'item was' : 'items were'} reduced to the stock left`)
  if (gone) parts.push(`${gone} ${gone === 1 ? 'item is' : 'items are'} no longer available`)
  return `Your cart was saved, but ${parts.join(' and ')}.`
}

// ---------------------------------------------------------------------------
// Stock messages shown on the product pages and the cart page (Sprint 3 fixes).

// How many of this product are already in the cart.
export const quantityInCart = (items = [], id) =>
  items.find((i) => i.id === id)?.qty ?? 0

// What the "Add to cart" button shows. When the whole stock is already in the
// cart the button is turned off and says so, instead of showing an error
// every time it is clicked.
export function addButtonState(product, inCart = 0) {
  const stock = Number(product?.stock) || 0
  if (stock <= 0) return { disabled: true, label: 'Out of stock', full: false }
  if (inCart >= stock) {
    const label = stock === 1 ? '✓ The last one is in your cart' : `✓ All ${stock} in your cart`
    return { disabled: true, label, full: true }
  }
  return { disabled: false, label: 'Add to cart', full: false }
}

// The note under one cart line.
//   'out'   = no stock left: the line has to be removed before checkout
//   'over'  = more in the cart than in stock: the quantity has to go down
//   'max'   = the whole stock is in the cart (fine, + is turned off)
//   null    = nothing to say
export function lineStatus(item) {
  const stock = Number(item?.stock) || 0
  if (stock <= 0) return { level: 'out', text: 'Out of stock now. Please remove it to continue.' }
  if (item.qty > stock) return { level: 'over', text: `Only ${stock} left. Please lower the quantity.` }
  if (item.qty === stock) {
    return { level: 'max', text: stock === 1 ? 'You have the last one in stock' : `You have all ${stock} in stock` }
  }
  return null
}

// Lines that stop the customer from going to checkout.
export const cartProblems = (items = []) =>
  items.filter((i) => ['out', 'over'].includes(lineStatus(i)?.level))

// Guest cart lines keep the price and stock from the moment they were added.
// This updates them with the current product list. Products that are no longer
// sold get stock 0, so the cart asks the customer to remove them.
export function refreshGuestItems(items = [], products = []) {
  const byId = new Map(products.map((p) => [p.id, p]))
  let changed = false
  const next = items.map((i) => {
    const p = byId.get(i.id)
    const price = p ? Number(p.price) : i.price // same price as when it was added (toCartItem)
    const stock = p ? p.stock : 0
    if (price === i.price && stock === i.stock) return i
    changed = true
    return { ...i, price, stock }
  })
  return changed ? next : items
}

// When stock dropped after products were added, the cart fixes itself instead of
// asking the customer: quantities go down to the stock left and sold-out products
// are taken out. Returns the new list and what changed, for one short notice.
//   changes: [{ id, name, from, to }]   (to = 0 means removed)
export function fitToStock(items = []) {
  const changes = []
  const next = []
  for (const i of items) {
    const stock = Math.max(Number(i.stock) || 0, 0)
    if (i.qty <= stock) { next.push(i); continue }
    changes.push({ id: i.id, name: i.name, from: i.qty, to: stock })
    if (stock > 0) next.push({ ...i, qty: stock })
  }
  return { items: changes.length ? next : items, changes }
}

// Text of the notice on the cart page, e.g.
// "Aloe Gel: only 1 left, so your quantity is now 1. Clay Mask is sold out and was removed."
export function stockChangeMessage(changes = []) {
  return changes
    .map((c) => (c.to === 0
      ? `${c.name} is sold out and was removed.`
      : `${c.name}: only ${c.to} left, so your quantity is now ${c.to}.`))
    .join(' ')
}
