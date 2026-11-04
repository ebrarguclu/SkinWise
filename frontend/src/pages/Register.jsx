import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext.jsx'

// TEMPORARY: connect to İdil Y.'s sign-up API. Fields match the customer fields in the project requirements.
export default function Register() {
  const [f, setF] = useState({ name: '', taxId: '', email: '', address: '', password: '' })
  const toast = useToast()
  const navigate = useNavigate()
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    if (Object.values(f).some((v) => !v.trim())) return toast.error('Please fill in all fields')
    if (f.password.length < 8) return toast.error('Password must be at least 8 characters')
    toast.success('Account created (demo)')
    navigate('/login')
  }

  return (
    <form className="card pad auth" onSubmit={submit}>
      <h1>Sign up</h1>
      <label>Full name<input value={f.name} onChange={on('name')} /></label>
      <label>Tax ID<input value={f.taxId} onChange={on('taxId')} inputMode="numeric" /></label>
      <label>Email<input type="email" value={f.email} onChange={on('email')} /></label>
      <label>Home address<textarea rows="2" value={f.address} onChange={on('address')} /></label>
      <label>Password<input type="password" value={f.password} onChange={on('password')} autoComplete="new-password" /></label>
      <button className="btn btn-primary btn-block">Sign up</button>
      <p className="muted center-text">Already have an account? <Link to="/login" className="link">Log in</Link></p>
    </form>
  )
}
