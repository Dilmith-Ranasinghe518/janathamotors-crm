import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiErrorMessage } from '../lib/api'
import { Button, Input } from '../components/ui'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@janathamotors.lk')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
        <p className="text-xl font-extrabold tracking-tight text-[var(--ink)]">Janatha Motors</p>
        <p className="mb-6 text-sm text-[var(--muted)]">Sign in to manage invoices &amp; inventory</p>

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
