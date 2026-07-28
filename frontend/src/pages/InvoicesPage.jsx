import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, EmptyState, PageHeader, Select, StatusBadge } from '../components/ui'

export function InvoicesPage() {
  const [status, setStatus] = useState('')

  const invoicesQuery = useQuery({
    queryKey: ['invoices', status],
    queryFn: () => api.get('/invoices', { params: { status: status || undefined } }).then((r) => r.data),
  })

  const invoices = invoicesQuery.data?.data ?? []

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Create sales, track payments and dues."
        actions={
          <Link
            to="/invoices/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            + New invoice
          </Link>
        }
      />

      <Select value={status} onChange={(e) => setStatus(e.target.value)} className="mb-4 max-w-xs">
        <option value="">All statuses</option>
        <option value="due">Due</option>
        <option value="partial">Partial</option>
        <option value="paid">Paid</option>
        <option value="cancelled">Cancelled</option>
      </Select>

      <Card className="overflow-x-auto">
        {invoicesQuery.isLoading ? (
          <p className="p-6 text-sm text-[var(--muted)]">Loading…</p>
        ) : invoices.length === 0 ? (
          <EmptyState message="No invoices yet." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3">
                    <Link to={`/invoices/${inv.id}`} className="font-mono text-xs text-[var(--accent-2)] hover:underline">
                      {inv.invoice_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{inv.customer?.name || 'Walk-in'}</td>
                  <td className="px-4 py-3">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(inv.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(inv.due_amount).toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
