import { request } from './client.js'

export const registerUser = (form) => request('/auth/register', { method: 'POST', body: form })
export const loginUser = (email, password) =>
  request('/auth/login', { method: 'POST', body: { email, password } })
export const logoutUser = () => request('/auth/logout', { method: 'POST', auth: true })
export const fetchMe = () => request('/auth/me', { auth: true })
