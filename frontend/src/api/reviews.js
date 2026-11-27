import { request } from './client.js'

// GET /products/:id/reviews/eligibility -> { canReview, reason }
export const fetchReviewEligibility = (productId) =>
  request(`/products/${encodeURIComponent(productId)}/reviews/eligibility`, { auth: true })

// POST /products/:id/reviews -> { id, productId, rating, comment, commentStatus }
export const createReview = (productId, { rating, comment }) =>
  request(`/products/${encodeURIComponent(productId)}/reviews`, {
    method: 'POST',
    auth: true,
    body: { rating, comment },
  })
