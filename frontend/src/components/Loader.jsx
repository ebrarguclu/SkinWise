// Shared loading indicator. Use it everywhere data is being fetched:
//   <Loader />                          -> "Loading…" with a spinner
//   <Loader label="Loading products…" />
//   <Loader inline size="sm" />          -> small, inside a line of text
// role="status" lets screen readers announce the text.
export default function Loader({ label = 'Loading…', inline = false, size = 'md' }) {
  return (
    <div className={inline ? 'loader loader-inline' : 'loader'} role="status" aria-live="polite">
      <span className={size === 'sm' ? 'spinner spinner-sm' : 'spinner'} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
