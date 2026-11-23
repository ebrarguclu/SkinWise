import { useEffect, useState } from 'react'
import { fetchReviews } from '../api/reviews.js'
import { formatReviewDate } from '../lib/review.js'
import StarDisplay from './StarDisplay.jsx'

// Approved comments of a product, newest first. Text is rendered as plain text only.
export default function ReviewList({ productId }) {
  const [state, setState] = useState({ status: 'loading', reviews: [] })

  useEffect(() => {
    let ignore = false
    setState({ status: 'loading', reviews: [] })
    fetchReviews(productId)
      .then((reviews) => { if (!ignore) setState({ status: 'ready', reviews }) })
      .catch(() => { if (!ignore) setState({ status: 'failed', reviews: [] }) })
    return () => { ignore = true }
  }, [productId])

  return (
    <section aria-label="Customer comments">
      <h4 style={{ margin: '0 0 .6rem' }}>Customer comments</h4>
      {state.status === 'loading' && <p className="muted">Loading comments…</p>}
      {state.status === 'failed' && <p className="sw-review-error" role="alert">Comments could not be loaded.</p>}
      {state.status === 'ready' && state.reviews.length === 0 && (
        <p className="muted">No approved comments yet.</p>
      )}
      {state.status === 'ready' && state.reviews.length > 0 && (
        <ul className="sw-review-list">
          {state.reviews.map((review) => (
            <li key={review.id} className="sw-review-item">
              <div className="sw-review-head">
                <StarDisplay value={review.rating} />
                <strong>{review.author}</strong>
                <small className="muted">{formatReviewDate(review.createdAt)}</small>
              </div>
              <p className="sw-review-text">{review.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
