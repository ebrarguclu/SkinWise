import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

// Fields match the customer fields in the project requirements.
export default function Register() {
  const [f, setF] = useState({ name: '', taxId: '', email: '', address: '', password: '' })
  const [busy, setBusy] = useState(false)
  const { user, register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value })

  // A guest who came from checkout goes back there after signing up.
  if (user) return <Navigate to={location.state?.from || '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    if (Object.values(f).some((v) => !v.trim())) return toast.error('Please fill in all fields')
    if (f.password.length < 8) return toast.error('Password must be at least 8 characters')
    setBusy(true)
    try {
      if (await register(f)) {
        toast.success('Account created')
      } else {
        toast.success('Account created. Please confirm your email, then log in.')
        navigate('/login', { state: location.state })
      }
    } catch (error) {
      toast.error(error.status ? error.message : 'Could not reach the server. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form className="card pad auth" onSubmit={submit}>
      <h1>Sign up</h1>
      <label>Full name<input value={f.name} onChange={on('name')} /></label>
      <label>Tax ID<input value={f.taxId} onChange={on('taxId')} inputMode="numeric" /></label>
      <label>Email<input type="email" value={f.email} onChange={on('email')} /></label>
      <label>Home address<textarea rows="2" value={f.address} onChange={on('address')} /></label>
      <label>Password<input type="password" value={f.password} onChange={on('password')} autoComplete="new-password" /></label>
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing up…' : 'Sign up'}</button>
      <p className="muted center-text">Already have an account? <Link to="/login" state={location.state} className="link">Log in</Link></p>
    </form>
  )
}
