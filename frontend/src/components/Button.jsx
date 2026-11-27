import { Link } from 'react-router-dom'

// Shared button. One component for every button and button-looking link on the site.
//   <Button onClick={save}>Save</Button>
//   <Button variant="outline" size="sm">Cancel</Button>
//   <Button type="submit" loading={busy} block>Log in</Button>   -> spinner + disabled while busy
//   <Button to="/products">Shop now</Button>                     -> renders a router <Link>
// variant: 'primary' | 'outline' | 'danger' | 'ghost'      size: 'md' | 'sm'
export default function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  to,
  type = 'button',
  className = '',
  disabled,
  children,
  ...rest
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size === 'sm' && 'btn-sm',
    block && 'btn-block',
    className,
  ].filter(Boolean).join(' ')

  if (to) {
    return <Link to={to} className={classes} {...rest}>{children}</Link>
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="spinner spinner-sm" aria-hidden="true" />}
      {children}
    </button>
  )
}
