import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('jms_user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('jms_token')
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get('/me')
      .then(({ data }) => {
        setUser(data)
        localStorage.setItem('jms_user', JSON.stringify(data))
      })
      .catch(() => {
        localStorage.removeItem('jms_token')
        localStorage.removeItem('jms_user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const { data } = await api.post('/login', { email, password })
    localStorage.setItem('jms_token', data.token)
    localStorage.setItem('jms_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  async function logout() {
    try {
      await api.post('/logout')
    } catch {
      // token may already be invalid — clear local state regardless
    }
    localStorage.removeItem('jms_token')
    localStorage.removeItem('jms_user')
    setUser(null)
  }

  function can(permission) {
    return Boolean(user?.permissions?.includes(permission))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
