import { request } from './client.js'

// GET /orders -> the logged-in user's orders, newest first:
// [{ id, status, totalAmount, deliveryAddress, createdAt, items: [{ productId, name, imageUrl, emoji, quantity, unitPrice }] }]
export const fetchMyOrders = () => request('/orders', { auth: true })

// POST /orders -> turns the cart into an order (status: processing)
export const createOrder = (deliveryAddress) =>
  request('/orders', { method: 'POST', auth: true, body: deliveryAddress ? { deliveryAddress } : {} })
