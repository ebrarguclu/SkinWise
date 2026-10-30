import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)
export const useToast = () => useContext(ToastContext)

// Usage: const toast = useToast();  toast.success('Added to cart')
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((type, message) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, type, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  const api = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i'} {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
