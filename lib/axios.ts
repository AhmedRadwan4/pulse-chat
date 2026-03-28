import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Attach the Better Auth session cookie automatically (browser sends it via withCredentials)
// Response interceptor: surface error messages from the API
api.interceptors.response.use(
  response => response,
  error => {
    const message = error.response?.data?.error ?? error.message ?? 'Unknown error'
    return Promise.reject(new Error(message))
  }
)

export default api
