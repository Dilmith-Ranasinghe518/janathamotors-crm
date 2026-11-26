import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { clearCachedData } from '../lib/offline'

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
      .catch((error) => {
        // Only a rejected login signs out; no network (offline) keeps the saved session.
        if (error?.response?.status === 401) {
          localStorage.removeItem('jms_token')
          localStorage.removeItem('jms_user')
          setUser(null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const { data } = await api.post('/login', { email, password })
    localStorage.setItem('jms_token', data.token)
    localStorage.setItem('jms_user', JSON.stringify(data.user))
    if (data.weak_password) localStorage.setItem('jms_weak_password', '1')
    else localStorage.removeItem('jms_weak_password')
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
    // Offline copies of business data are removed on sign-out (unsynced bills are kept to upload later).
    clearCachedData()
    setUser(null)
  }

  function can(permission) {
    return Boolean(user?.permissions?.includes(permission))
  }

  function hasRole(roleName) {
    if (!user?.roles) return false
    return user.roles.some((r) => (typeof r === 'string' ? r === roleName : r?.name === roleName))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
