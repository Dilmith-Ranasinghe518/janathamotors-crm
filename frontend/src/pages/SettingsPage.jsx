import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, Input, PageHeader } from '../components/ui'

function UpdatePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const passwordMutation = useMutation({
    mutationFn: (payload) => api.put('/user/password', payload),
    onSuccess: () => {
      setSuccess('Password updated successfully.')
      setError('')
      setCurrentPassword('')
      setPassword('')
      setPasswordConfirmation('')
      setTimeout(() => setSuccess(''), 4000)
    },
    onError: (err) => {
      setSuccess('')
      setError(apiErrorMessage(err, 'Failed to update password.'))
    },
  })

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== passwordConfirmation) {
      setError('New password and confirmation do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    passwordMutation.mutate({
      current_password: currentPassword,
      password: password,
      password_confirmation: passwordConfirmation,
    })
  }

  return (
    <Card className="max-w-xl p-6">
      <h2 className="text-base font-bold text-[var(--ink)] mb-1">Update Password</h2>
      <p className="text-xs text-[var(--muted)] mb-4">Ensure your account is using a secure password (minimum 8 characters).</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Current password"
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          label="New password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Confirm new password"
          type="password"
          required
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
        />

        {error && <p className="text-sm font-medium text-[var(--critical)]">{error}</p>}
        {success && <p className="text-sm font-medium text-[var(--success)]">{success}</p>}

        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={passwordMutation.isPending}>
            {passwordMutation.isPending ? 'Updating password…' : 'Update password'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function CompanySettingsForm() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  })

  useEffect(() => {
    if (data && !form) setForm(data)
  }, [data, form])

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put('/settings', payload),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(['settings'], data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save settings.')),
  })

  if (isLoading || !form) return null

  return (
    <Card className="max-w-xl p-6">
      <h2 className="text-base font-bold text-[var(--ink)] mb-1">Company Profile &amp; Invoicing</h2>
      <p className="text-xs text-[var(--muted)] mb-4">Manage company branding, default invoice prefixes, and tax rates.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError('')
          saveMutation.mutate(form)
        }}
        className="flex flex-col gap-4"
      >
        <Input label="Company name" value={form.company_name ?? ''} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        <Input label="Tagline" value={form.company_tagline ?? ''} onChange={(e) => setForm({ ...form, company_tagline: e.target.value })} />
        <Input label="Invoice prefix" value={form.invoice_prefix ?? ''} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })} />
        <Input label="Tax rate (%)" type="number" step="0.01" value={form.tax_rate ?? ''} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} />

        {error && <p className="text-sm font-medium text-[var(--critical)]">{error}</p>}
        {saved && <p className="text-sm font-medium text-[var(--success)]">Company settings saved.</p>}

        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export function SettingsPage() {
  const { can } = useAuth()

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account password and application configurations." />

      <div className="flex flex-col gap-6">
        <UpdatePasswordForm />
        {can('manage_settings') && <CompanySettingsForm />}
      </div>
    </div>
  )
}
