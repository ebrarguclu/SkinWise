const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'
const SESSION_KEY = 'sw_session'

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}

export function saveSession(session) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch { /* storage unavailable */ }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY) } catch { /* storage unavailable */ }
}

async function send(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 204) return null

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const error = new Error(data?.error || `Request to ${path} failed with status ${res.status}`)
    error.status = res.status
    throw error
  }
  return data
}

// Refresh tokens work once, so parallel requests must share a single refresh.
let refreshing = null
function refreshSession() {
  if (!refreshing) {
    refreshing = send('/auth/refresh', { method: 'POST', body: { refreshToken: getSession()?.refreshToken } })
      .then(({ session }) => saveSession(session))
      .catch((error) => {
        if (error.status === 401) clearSession()
        throw error
      })
      .finally(() => { refreshing = null })
  }
  return refreshing
}

// Pass auth: true for endpoints that need a logged-in user.
export async function request(path, { auth = false, ...options } = {}) {
  if (!auth) return send(path, options)

  const token = getSession()?.accessToken
  try {
    return await send(path, { ...options, token })
  } catch (error) {
    if (error.status !== 401 || !token) throw error
  }

  await refreshSession()
  return send(path, { ...options, token: getSession()?.accessToken })
}
