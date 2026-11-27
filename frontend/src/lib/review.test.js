import { describe, expect, test } from 'vitest'
import {
  MAX_COMMENT_LENGTH, cleanComment, notAllowedMessage, reviewErrorMessage, successMessage, validateReview,
} from './review.js'

describe('validateReview', () => {
  test('accepts a rating alone', () => {
    expect(validateReview({ rating: 5 })).toBeNull()
  })

  test('accepts a rating with a comment', () => {
    expect(validateReview({ rating: 3, comment: 'Nice cream' })).toBeNull()
  })

  test('accepts a comment of exactly 1000 characters', () => {
    expect(validateReview({ rating: 4, comment: 'x'.repeat(MAX_COMMENT_LENGTH) })).toBeNull()
  })

  test('requires a rating', () => {
    expect(validateReview({ rating: 0 })).toMatch(/rating/i)
    expect(validateReview({ comment: 'no stars' })).toMatch(/rating/i)
  })

  test('rejects ratings outside 1-5 and non-whole numbers', () => {
    for (const rating of [0, 6, -1, 4.5, '4', null, NaN]) {
      expect(validateReview({ rating })).toMatch(/rating/i)
    }
  })

  test('rejects a comment over 1000 characters', () => {
    expect(validateReview({ rating: 5, comment: 'x'.repeat(MAX_COMMENT_LENGTH + 1) })).toMatch(/1000/)
  })

  test('spaces around the comment do not count towards the limit', () => {
    const comment = `  ${'x'.repeat(MAX_COMMENT_LENGTH)}  `
    expect(validateReview({ rating: 5, comment })).toBeNull()
  })
})

describe('cleanComment', () => {
  test('trims the comment', () => {
    expect(cleanComment('  hi  ')).toBe('hi')
  })

  test('returns an empty string for blank or missing comments', () => {
    expect(cleanComment('   ')).toBe('')
    expect(cleanComment(undefined)).toBe('')
    expect(cleanComment(null)).toBe('')
  })
})

describe('reviewErrorMessage', () => {
  const apiError = (status, message) => Object.assign(new Error(message), { status })

  test('shows the backend message for 400, 403, 404 and 409', () => {
    for (const status of [400, 403, 404, 409]) {
      expect(reviewErrorMessage(apiError(status, 'Backend says no'))).toBe('Backend says no')
    }
  })

  test('asks the user to log in again after a 401', () => {
    expect(reviewErrorMessage(apiError(401, 'Invalid or expired session'))).toMatch(/log in again/i)
  })

  test('uses a generic message for server errors', () => {
    expect(reviewErrorMessage(apiError(500, 'Internal server error'))).toMatch(/something went wrong/i)
  })

  test('says the server could not be reached when there is no status (network error)', () => {
    expect(reviewErrorMessage(new TypeError('Failed to fetch'))).toBe('Could not reach the server. Please try again.')
    expect(reviewErrorMessage(undefined)).toBe('Could not reach the server. Please try again.')
  })
})

describe('successMessage', () => {
  test('says the comment is waiting for approval when there is a comment', () => {
    expect(successMessage('Great')).toBe('Your comment is waiting for approval')
  })

  test('thanks the user for a rating-only review', () => {
    expect(successMessage('')).toBe('Thanks, your rating was saved')
    expect(successMessage('   ')).toBe('Thanks, your rating was saved')
    expect(successMessage(undefined)).toBe('Thanks, your rating was saved')
  })
})

describe('notAllowedMessage', () => {
  test('has a message for each reason', () => {
    expect(notAllowedMessage('not_delivered')).toMatch(/received/i)
    expect(notAllowedMessage('already_reviewed')).toMatch(/already reviewed/i)
  })

  test('falls back to the not-delivered message for an unknown reason', () => {
    expect(notAllowedMessage('something_else')).toMatch(/received/i)
  })
})
