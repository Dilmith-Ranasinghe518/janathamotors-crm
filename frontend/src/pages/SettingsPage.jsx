import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Power,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, Input, Modal, PageHeader } from '../components/ui'

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

function MaintenanceModeCard() {
  const queryClient = useQueryClient()
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [targetAction, setTargetAction] = useState(null) // 'enable' | 'disable'
  const [noticeMessage, setNoticeMessage] = useState('')
  const [feedback, setFeedback] = useState(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  })

  useEffect(() => {
    if (settings?.maintenance_message) {
      setNoticeMessage(settings.maintenance_message)
    } else if (!noticeMessage) {
      setNoticeMessage('The system is currently undergoing scheduled maintenance. Please check back later.')
    }
  }, [settings?.maintenance_message])

  const toggleMutation = useMutation({
    mutationFn: (payload) => api.post('/settings/maintenance', payload).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['maintenance-status'] })
      setConfirmModalOpen(false)
      setFeedback({
        type: 'success',
        text: data.message,
      })
      setTimeout(() => setFeedback(null), 6000)
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        text: apiErrorMessage(err, 'Failed to update maintenance mode.'),
      })
    },
  })

  if (isLoading || !settings) return null

  const isMaintenance = Boolean(settings.maintenance_mode)

  function openEnableModal() {
    setTargetAction('enable')
    setConfirmModalOpen(true)
  }

  function openDisableModal() {
    setTargetAction('disable')
    setConfirmModalOpen(true)
  }

  function handleConfirm() {
    toggleMutation.mutate({
      enabled: targetAction === 'enable',
      message: noticeMessage,
    })
  }

  return (
    <>
      <Card
        className={`max-w-xl p-6 transition-all ${
          isMaintenance
            ? 'border-amber-500/50 bg-amber-500/5 shadow-md shadow-amber-500/5'
            : ''
        }`}
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isMaintenance
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-[var(--line)] text-[var(--muted)]'
              }`}
            >
              {isMaintenance ? <ShieldAlert className="h-5 w-5" /> : <Power className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--ink)]">System Maintenance Mode</h2>
              <p className="text-xs text-[var(--muted)]">
                Restrict access exclusively to Admins and terminate non-admin sessions.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase whitespace-nowrap ${
              isMaintenance
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                : 'bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]/20'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isMaintenance ? 'bg-amber-500 animate-ping' : 'bg-[var(--success)]'
              }`}
            />
            {isMaintenance ? 'Active (Locked)' : 'Normal Operation'}
          </span>
        </div>

        {/* Detailed Status Explanation */}
        <div className="mb-4 text-xs leading-relaxed">
          {isMaintenance ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-900 dark:text-amber-200">
              <p className="font-semibold mb-1 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                All non-admin users are currently blocked from using the CRM.
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                <li>Existing non-admin sessions have been terminated.</li>
                <li>New non-admin logins are rejected.</li>
                <li>Only administrators can access modules and settings.</li>
              </ul>
              {settings.maintenance_enabled_at && (
                <p className="mt-2 text-[10px] text-amber-700/80 dark:text-amber-400">
                  Enabled on: {new Date(settings.maintenance_enabled_at).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <p className="text-[var(--muted)]">
              When maintenance mode is turned on, all non-admin users (cashiers, inventory clerks, managers) are immediately signed out, and only administrators will be allowed to sign in.
            </p>
          )}
        </div>

        {/* Notice Message Preview / Edit */}
        <div className="mb-5">
          <Input
            label="Maintenance notice shown to users"
            placeholder="e.g. System is undergoing scheduled maintenance. Please check back later."
            value={noticeMessage}
            onChange={(e) => setNoticeMessage(e.target.value)}
            disabled={isMaintenance}
          />
          <span className="text-[11px] text-[var(--muted)] mt-1 block">
            This message will be shown on the sign-in screen if a regular user tries to access the system.
          </span>
        </div>

        {feedback && (
          <p
            className={`mb-4 text-xs font-semibold ${
              feedback.type === 'success' ? 'text-[var(--success)]' : 'text-[var(--critical)]'
            }`}
          >
            {feedback.text}
          </p>
        )}

        <div className="flex items-center justify-end pt-1">
          {isMaintenance ? (
            <Button
              type="button"
              variant="primary"
              onClick={openDisableModal}
              disabled={toggleMutation.isPending}
              className="flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Turn OFF Maintenance Mode</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="danger"
              onClick={openEnableModal}
              disabled={toggleMutation.isPending}
              className="flex items-center gap-1.5"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Turn ON Maintenance Mode</span>
            </Button>
          )}
        </div>
      </Card>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <Modal
          title={
            targetAction === 'enable'
              ? 'Enable Maintenance Mode?'
              : 'Disable Maintenance Mode?'
          }
          onClose={() => !toggleMutation.isPending && setConfirmModalOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  targetAction === 'enable'
                    ? 'bg-amber-500/20 text-amber-600'
                    : 'bg-[var(--success-soft)] text-[var(--success)]'
                }`}
              >
                {targetAction === 'enable' ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <CheckCircle2 className="h-6 w-6" />
                )}
              </div>
              <div className="text-sm">
                {targetAction === 'enable' ? (
                  <>
                    <p className="font-semibold text-[var(--ink)]">
                      Immediate Session Termination &amp; Lockout
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                      Activating maintenance mode will <strong>instantly terminate all active sessions</strong> for non-admin users (cashiers, clerks, managers) across all devices and prevent them from signing in. Only users with the <strong>Admin</strong> role can sign in.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-[var(--ink)]">
                      Restore Normal System Access
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                      This will disable maintenance mode. All staff members will be able to sign in and use the CRM normally.
                    </p>
                  </>
                )}
              </div>
            </div>

            {targetAction === 'enable' && (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 text-xs">
                <span className="font-semibold text-[var(--ink)] block mb-1">
                  Notice displayed to users:
                </span>
                <p className="text-[var(--muted)] italic">
                  &ldquo;{noticeMessage || 'The system is currently undergoing scheduled maintenance. Please check back later.'}&rdquo;
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--line)]">
              <Button
                type="button"
                variant="secondary"
                disabled={toggleMutation.isPending}
                onClick={() => setConfirmModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={targetAction === 'enable' ? 'danger' : 'primary'}
                disabled={toggleMutation.isPending}
                onClick={handleConfirm}
              >
                {toggleMutation.isPending
                  ? 'Processing…'
                  : targetAction === 'enable'
                  ? 'Yes, Enable Maintenance Mode'
                  : 'Yes, Restore Normal Access'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
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
        {can('manage_settings') && <MaintenanceModeCard />}
      </div>
    </div>
  )
}
