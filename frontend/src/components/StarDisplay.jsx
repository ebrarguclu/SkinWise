const STARS = [1, 2, 3, 4, 5]

// Read-only stars for an average rating (0-5). The value is rounded to whole stars.
export default function StarDisplay({ value }) {
  const rating = Math.min(Math.max(Number(value) || 0, 0), 5)
  const filled = Math.round(rating)

  return (
    <span className="sw-stars-static" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {STARS.map((star) => (
        <span key={star} className={star <= filled ? 'sw-star-s sw-star-s-on' : 'sw-star-s'} aria-hidden="true">★</span>
      ))}
    </span>
  )
}
