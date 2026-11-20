import { request } from './client.js'

// The saved cart of the logged-in user (cart_items). A guest's cart stays in localStorage.
// Every call returns { items: [{ productId, name, emoji, imageUrl, price, stock, quantity }] }
export const fetchCart = () => request('/cart', { auth: true })

// -> { items, added, reason }
export const addCartItem = (productId, quantity = 1) =>
  request('/cart', { method: 'POST', auth: true, body: { productId, quantity } })

// -> { items, quantity, reason }
export const updateCartItem = (productId, quantity) =>
  request(`/cart/${productId}`, { method: 'PATCH', auth: true, body: { quantity } })

export const removeCartItem = (productId) =>
  request(`/cart/${productId}`, { method: 'DELETE', auth: true })

// Right after login: moves the guest cart into the saved cart -> { items, adjusted }
export const mergeGuestCart = (items) =>
  request('/cart/merge', { method: 'POST', auth: true, body: { items } })
