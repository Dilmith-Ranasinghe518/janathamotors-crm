import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ permission }) {
  const { user, loading, can } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-[var(--muted)]">
        Loading…
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (permission && !can(permission)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-semibold text-[var(--ink)]">Access restricted</p>
        <p className="text-sm text-[var(--muted)]">You don't have permission to view this page.</p>
      </div>
    )
  }

  return <Outlet />
}
