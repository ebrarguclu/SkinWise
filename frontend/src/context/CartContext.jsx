import { createContext, useContext, useEffect, useState } from 'react'
import { addItem, cartCount, cartTotal, loadCart, removeItem, saveCart, setItemQuantity } from '../lib/cart.js'

// Guest cart (Jira DP-14): kept in localStorage, so it works without logging in
// and survives a page refresh. The rules live in src/lib/cart.js.
// Sprint 2: after login this cart will be merged into the cart_items table.
const CartContext = createContext(null)
export const useCart = () => useContext(CartContext)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => loadCart(localStorage))

  useEffect(() => { saveCart(localStorage, items) }, [items])

  // Returns { added, reason } so the page can show the right message.
  const add = (product, qty = 1) => {
    const result = addItem(items, product, qty)
    setItems(result.items)
    return { added: result.added, reason: result.reason }
  }
  const setQty = (id, qty) => setItems((prev) => setItemQuantity(prev, id, qty))
  const remove = (id) => setItems((prev) => removeItem(prev, id))
  const clear = () => setItems([])

  return (
    <CartContext.Provider value={{ items, add, setQty, remove, clear, count: cartCount(items), total: cartTotal(items) }}>
      {children}
    </CartContext.Provider>
  )
}
