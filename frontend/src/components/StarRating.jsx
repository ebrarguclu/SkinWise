import { useRef } from 'react'

const STARS = [1, 2, 3, 4, 5]

// Star rating input. Works as a radio group: Tab to enter, arrow keys to change.
export default function StarRating({ value, onChange, disabled = false, label = 'Rating' }) {
  const refs = useRef([])

  const move = (e, star) => {
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(star + 1, 5)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(star - 1, 1)
    if (next === null) return
    e.preventDefault()
    onChange(next)
    refs.current[next - 1]?.focus()
  }

  // Only one star is in the tab order: the chosen one, or the first if none is chosen.
  const tabStop = value >= 1 ? value : 1

  return (
    <div className="sw-stars" role="radiogroup" aria-label={label}>
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          ref={(el) => { refs.current[star - 1] = el }}
          className={star <= value ? 'sw-star sw-star-on' : 'sw-star'}
          aria-checked={star === value}
          aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
          tabIndex={star === tabStop ? 0 : -1}
          disabled={disabled}
          onClick={() => onChange(star)}
          onKeyDown={(e) => move(e, star)}
        >
          ★
        </button>
      ))}
    </div>
  )
}
