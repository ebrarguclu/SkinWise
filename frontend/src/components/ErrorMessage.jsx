import Button from './Button.jsx'

// Shared error box. Use it when something could not be loaded or saved:
//   <ErrorMessage message="Products could not be loaded." />
//   <ErrorMessage title="Payment failed" message={error.message} onRetry={tryAgain} />
// role="alert" makes screen readers read it out right away.
export default function ErrorMessage({
  title = 'Something went wrong',
  message = 'Please try again later.',
  onRetry,
  retryLabel = 'Try again',
}) {
  return (
    <div className="error-box" role="alert">
      <span className="error-box-icon" aria-hidden="true">⚠️</span>
      <div className="error-box-body">
        <strong>{title}</strong>
        {message && <p>{message}</p>}
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>{retryLabel}</Button>
        )}
      </div>
    </div>
  )
}
