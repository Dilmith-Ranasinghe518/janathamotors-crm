import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, Input, PageHeader } from '../components/ui'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings').then((r) => r.data) })

  useEffect(() => {
    if (data && !form) setForm(data)
  }, [data, form])

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put('/settings', payload),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(['settings'], data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save settings.')),
  })

  if (!form) return <p className="text-sm text-[var(--muted)]">Loading…</p>

  return (
    <div>
      <PageHeader title="Settings" description="Company profile, invoicing defaults, and tax rate." />

      <Card className="max-w-xl p-6">
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

          {error && <p className="text-sm text-[var(--critical)]">{error}</p>}
          {saved && <p className="text-sm text-[var(--success)]">Settings saved.</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : 'Save settings'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
