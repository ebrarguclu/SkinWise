import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { createReview, fetchReviewEligibility } from '../api/reviews.js'
import {
  MAX_COMMENT_LENGTH, notAllowedMessage, reviewErrorMessage, successMessage, validateReview,
} from '../lib/review.js'
import StarRating from './StarRating.jsx'

// Rating + comment form. It is shown only to users who may review this product.
// access: 'loading' | 'login' | 'allowed' | 'blocked' | 'failed'
export default function ReviewForm({ productId }) {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const [access, setAccess] = useState({ state: 'loading', reason: null, message: '' })
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [doneMessage, setDoneMessage] = useState('')

  // Ask the backend whether this user may review (after we know who is logged in).
  useEffect(() => {
    if (authLoading) return
    if (!user) { setAccess({ state: 'login', reason: null, message: '' }); return }

    let ignore = false
    setAccess({ state: 'loading', reason: null, message: '' })
    fetchReviewEligibility(productId)
      .then(({ canReview, reason }) => {
        if (ignore) return
        setAccess(canReview
          ? { state: 'allowed', reason: null, message: '' }
          : { state: 'blocked', reason, message: '' })
      })
      .catch((error) => {
        if (!ignore) setAccess({ state: 'failed', reason: null, message: reviewErrorMessage(error) })
      })
    return () => { ignore = true }
  }, [productId, user, authLoading])

  const submit = async (e) => {
    e.preventDefault()
    const problem = validateReview({ rating, comment })
    if (problem) { setFormError(problem); return }

    setSubmitting(true)
    setFormError('')
    try {
      await createReview(productId, { rating, comment })
      setDoneMessage(successMessage(comment))
    } catch (error) {
      setFormError(reviewErrorMessage(error)) // typed text and stars stay as they are
    } finally {
      setSubmitting(false)
    }
  }

  if (doneMessage) return <p className="stock" role="status">✓ {doneMessage}</p>
  if (authLoading || access.state === 'loading') return <p className="muted">Loading…</p>
  if (access.state === 'login') {
    return (
      <p className="muted">
        <Link to="/login" state={{ from: location.pathname }} className="link">Log in</Link>
        {' '}to review products you received.
      </p>
    )
  }
  if (access.state === 'failed') return <p className="sw-review-error" role="alert">{access.message}</p>
  if (access.state === 'blocked') return <p className="muted">{notAllowedMessage(access.reason)}</p>

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <div>
        <span id="review-rating-label" className="block">Your rating</span>
        <StarRating value={rating} onChange={setRating} disabled={submitting} label="Your rating" />
      </div>
      <label>
        Comment (optional)
        <textarea
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={submitting}
          aria-describedby="review-comment-counter"
        />
        <small
          id="review-comment-counter"
          className={comment.length > MAX_COMMENT_LENGTH ? 'sw-counter sw-counter-over' : 'sw-counter muted'}
        >
          {comment.length} / {MAX_COMMENT_LENGTH}
        </small>
      </label>
      {formError && <p className="sw-review-error" role="alert">{formError}</p>}
      <button className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send review'}
      </button>
    </form>
  )
}
