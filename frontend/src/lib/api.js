import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jms_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('jms_token')
      localStorage.removeItem('jms_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export function apiErrorMessage(error, fallback = 'Something went wrong.') {
  const data = error?.response?.data
  if (!data) return fallback
  if (data.message) return data.message
  if (data.errors) return Object.values(data.errors).flat().join(' ')
  return fallback
}
