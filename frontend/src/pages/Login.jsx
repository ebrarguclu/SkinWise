import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext.jsx'

// TEMPORARY: connect the submit handler to İdil Y.'s auth API when it is ready.
export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const toast = useToast()
  const navigate = useNavigate()
  const on = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error('Email and password are required')
    toast.success('Logged in (demo)')
    navigate('/')
  }

  return (
    <form className="card pad auth" onSubmit={submit}>
      <h1>Log in</h1>
      <label>Email<input type="email" value={form.email} onChange={on('email')} autoComplete="email" /></label>
      <label>Password<input type="password" value={form.password} onChange={on('password')} autoComplete="current-password" /></label>
      <button className="btn btn-primary btn-block">Log in</button>
      <p className="muted center-text">Don't have an account? <Link to="/register" className="link">Sign up</Link></p>
    </form>
  )
}
