// Review form rules (Jira DP-59). Pure functions, easy to unit test.

export const MAX_COMMENT_LENGTH = 1000

// Comment without spaces around it; empty text means "no comment".
export const cleanComment = (comment) => (typeof comment === 'string' ? comment.trim() : '')

// Returns an error message, or null when the review can be sent.
export function validateReview({ rating, comment }) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return 'Please choose a rating from 1 to 5 stars'
  }
  if (cleanComment(comment).length > MAX_COMMENT_LENGTH) {
    return `Comment must be at most ${MAX_COMMENT_LENGTH} characters`
  }
  return null
}

// Turns an API error into text for the user.
// client.js puts the backend message in error.message and the HTTP code in error.status.
export function reviewErrorMessage(error) {
  if (!error || !error.status) return 'Could not reach the server. Please try again.'
  if (error.status === 401) return 'Your session has expired. Please log in again.'
  if (error.status >= 500) return 'Something went wrong. Please try again later.'
  return error.message || 'Your review could not be saved.'
}

// Shown after a successful send.
export const successMessage = (comment) =>
  cleanComment(comment) ? 'Your comment is waiting for approval' : 'Thanks, your rating was saved'

// Messages for the "not allowed" reasons of GET /products/:id/reviews/eligibility.
const NOT_ALLOWED = {
  not_delivered: 'Only customers who received this product can review it.',
  already_reviewed: 'You have already reviewed this product.',
}
export const notAllowedMessage = (reason) => NOT_ALLOWED[reason] || NOT_ALLOWED.not_delivered
