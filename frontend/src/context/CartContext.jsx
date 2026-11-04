import { createContext, useContext, useEffect, useState } from 'react'

// TEMPORARY cart (will be connected to the backend when Fethiye's cart/DB work is done).
// The guest cart is kept in localStorage.
const CartContext = createContext(null)
export const useCart = () => useContext(CartContext)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sw_cart')) || [] } catch { return [] }
  })

  useEffect(() => { localStorage.setItem('sw_cart', JSON.stringify(items)) }, [items])

  const add = (product, qty = 1) =>
    setItems((prev) => {
      const found = prev.find((i) => i.id === product.id)
      if (found) return prev.map((i) => i.id === product.id ? { ...i, qty: Math.min(i.qty + qty, product.stock) } : i)
      return [...prev, { id: product.id, name: product.name, price: product.price, emoji: product.emoji, stock: product.stock, qty }]
    })
  const setQty = (id, qty) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, qty: Math.max(1, Math.min(qty, i.stock)) } : i))
  const remove = (id) => setItems((prev) => prev.filter((i) => i.id !== id))
  const clear = () => setItems([])

  const count = items.reduce((s, i) => s + i.qty, 0)
  const total = items.reduce((s, i) => s + i.qty * i.price, 0)

  return (
    <CartContext.Provider value={{ items, add, setQty, remove, clear, count, total }}>
      {children}
    </CartContext.Provider>
  )
}
