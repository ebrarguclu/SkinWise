import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { useToast } from './ToastContext.jsx'
import {
  addItem, cartCount, cartTotal, fromServerItems, loadCart, mergeMessage,
  removeItem, saveCart, setItemQuantity, toMergeItems,
} from '../lib/cart.js'
import { addCartItem, fetchCart, mergeGuestCart, removeCartItem, updateCartItem } from '../api/cart.js'

// One cart for the whole site (Jira DP-14).
//   Guest:     kept in localStorage (Sprint 1). Works without logging in.
//   Logged in: kept in the database (cart_items) through the /cart API (Sprint 2),
//              so POST /orders can turn it into an order.
// At login the guest cart is merged into the saved one and then removed from the browser.
const CartContext = createContext(null)
export const useCart = () => useContext(CartContext)

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const toast = useToast()
  const [guestItems, setGuestItems] = useState(() => loadCart(localStorage))
  const [savedItems, setSavedItems] = useState([])
  const [ready, setReady] = useState(true)       // false while the saved cart is loading
  const [updating, setUpdating] = useState(false) // true while a change is being saved
  const syncedUserId = useRef(null)
  const toastRef = useRef(toast)
  toastRef.current = toast

  useEffect(() => { saveCart(localStorage, guestItems) }, [guestItems])

  // Runs once per login. The ref also stops React's development double-run
  // from sending the guest cart twice.
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      syncedUserId.current = null
      setSavedItems((prev) => (prev.length ? [] : prev))
      setReady(true)
      return
    }
    if (syncedUserId.current === user.id) return
    syncedUserId.current = user.id

    const guest = loadCart(localStorage)
    // Take the guest cart out of the browser before sending it, so it is merged only once.
    if (guest.length) { saveCart(localStorage, []); setGuestItems([]) }
    setReady(false)

    const job = guest.length ? mergeGuestCart(toMergeItems(guest)) : fetchCart()
    job
      .then(({ items, adjusted }) => {
        if (syncedUserId.current !== user.id) return
        setSavedItems(fromServerItems(items))
        const note = mergeMessage(adjusted)
        if (note) toastRef.current.info(note)
      })
      .catch(() => {
        if (guest.length) { saveCart(localStorage, guest); setGuestItems(guest) } // nothing lost
        toastRef.current.error('Could not load your saved cart. Please refresh the page.')
      })
      .finally(() => { if (syncedUserId.current === user.id) setReady(true) })
  }, [user, authLoading])

  const loggedIn = Boolean(user)
  const items = loggedIn ? savedItems : guestItems

  // Saves a change to the database and shows the cart the backend sends back.
  const save = async (call) => {
    setUpdating(true)
    try {
      const result = await call()
      setSavedItems(fromServerItems(result.items))
      return result
    } finally {
      setUpdating(false)
    }
  }

  // Returns { added, reason } so the page can show the right message.
  const add = async (product, qty = 1) => {
    if (!loggedIn) {
      const result = addItem(guestItems, product, qty)
      setGuestItems(result.items)
      return { added: result.added, reason: result.reason }
    }
    try {
      const { added, reason } = await save(() => addCartItem(product.id, qty))
      return { added, reason }
    } catch (error) {
      if (error.status === 409) return { added: 0, reason: error.data?.reason || 'stock_limit' }
      throw error
    }
  }

  const setQty = async (id, qty) => {
    if (!loggedIn) return setGuestItems((prev) => setItemQuantity(prev, id, qty))
    if (qty < 1) return
    try {
      await save(() => updateCartItem(id, qty))
    } catch (error) {
      toast.error(error.status ? error.message : 'Could not update your cart. Please try again.')
    }
  }

  const remove = async (id) => {
    if (!loggedIn) return setGuestItems((prev) => removeItem(prev, id))
    try {
      await save(() => removeCartItem(id))
    } catch (error) {
      toast.error(error.status ? error.message : 'Could not update your cart. Please try again.')
    }
  }

  // After an order the backend empties the saved cart; this shows the new state.
  const refresh = async () => {
    if (!loggedIn) return
    try { await save(fetchCart) } catch { /* the next page load tries again */ }
  }

  const clear = () => (loggedIn ? refresh() : setGuestItems([]))

  return (
    <CartContext.Provider value={{
      items, add, setQty, remove, clear, refresh, ready, updating, loggedIn,
      count: cartCount(items), total: cartTotal(items),
    }}>
      {children}
    </CartContext.Provider>
  )
}
