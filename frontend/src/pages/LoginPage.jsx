import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Input } from '../components/ui'
import logo from '../assets/logo.webp'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isKickedByMaintenance = searchParams.get('maintenance') === '1'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: maintenanceInfo } = useQuery({
    queryKey: ['maintenance-status'],
    queryFn: () => api.get('/maintenance-status').then((r) => r.data),
    staleTime: 10000,
  })

  const isMaintenanceActive = Boolean(maintenanceInfo?.maintenance_mode) || isKickedByMaintenance

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not sign in. Check your credentials.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 border border-[var(--line)] shadow-xs">
            <img src={logo} alt="Janatha Motors Logo" className="h-full w-full object-contain rounded-full" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[var(--ink)] leading-snug">Janatha Motors</h1>
            <p className="text-xs text-[var(--muted)]">Sign in to manage invoices &amp; inventory</p>
          </div>
        </div>

        {/* Maintenance Mode Warning Notice */}
        {isMaintenanceActive && (
          <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold text-xs uppercase tracking-wider">Maintenance Mode Active</p>
                <p className="mt-1 leading-relaxed text-[11px]">
                  {maintenanceInfo?.maintenance_message ||
                    'Only administrators can sign in at this time. All other sessions have been suspended for maintenance.'}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-[var(--critical)]">{error}</p>}
          <Button type="submit" disabled={submitting} className="mt-2 w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
