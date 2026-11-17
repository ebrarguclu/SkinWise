import { createContext, useContext, useEffect, useState } from 'react'
import { fetchMe, loginUser, logoutUser, registerUser } from '../api/auth.js'
import { clearSession, getSession, saveSession } from '../api/client.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(getSession()))

  useEffect(() => {
    if (!getSession()) return
    let ignore = false
    fetchMe()
      .then((me) => { if (!ignore) setUser(me) })
      .catch((error) => {
        // A network error keeps the session so the next page load can try again.
        if (!ignore && error.status === 401) clearSession()
      })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])

  const startSession = async (session) => {
    saveSession(session)
    try {
      setUser(await fetchMe())
    } catch (error) {
      clearSession()
      throw error
    }
  }

  const login = async (email, password) => {
    const { session } = await loginUser(email, password)
    await startSession(session)
  }

  // Resolves to false when the user has to confirm their email before logging in.
  const register = async (form) => {
    const { session } = await registerUser(form)
    if (!session) return false
    await startSession(session)
    return true
  }

  const logout = async () => {
    // Log out locally even if the server cannot be reached.
    await logoutUser().catch(() => {})
    clearSession()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
