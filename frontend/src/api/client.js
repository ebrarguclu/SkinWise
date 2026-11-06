const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

// Sends a GET request to the backend and returns the JSON body.
// Throws an error with .status when the response is not 2xx.
export async function request(path) {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) {
    const error = new Error(`Request to ${path} failed with status ${res.status}`)
    error.status = res.status
    throw error
  }
  return res.json()
}
