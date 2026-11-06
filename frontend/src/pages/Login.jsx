import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const { user, login } = useAuth()
  const toast = useToast()
  const location = useLocation()
  const on = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // Also sends the user back to the page they came from after logging in.
  if (user) return <Navigate to={location.state?.from || '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error('Email and password are required')
    setBusy(true)
    try {
      await login(form.email, form.password)
      toast.success('Logged in')
    } catch (error) {
      toast.error(error.status ? error.message : 'Could not reach the server. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form className="card pad auth" onSubmit={submit}>
      <h1>Log in</h1>
      <label>Email<input type="email" value={form.email} onChange={on('email')} autoComplete="email" /></label>
      <label>Password<input type="password" value={form.password} onChange={on('password')} autoComplete="current-password" /></label>
      <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      <p className="muted center-text">Don't have an account? <Link to="/register" className="link">Sign up</Link></p>
    </form>
  )
}
