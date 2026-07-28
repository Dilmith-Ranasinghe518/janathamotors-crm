import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Card, EmptyState, PageHeader, StatusBadge } from '../components/ui'

export function CustomerDetailPage() {
  const { id } = useParams()
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customers', id],
    queryFn: () => api.get(`/customers/${id}`).then((r) => r.data),
  })

  if (isLoading) return <p className="text-sm text-[var(--muted)]">Loading…</p>
  if (!customer) return <EmptyState message="Customer not found." />

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={[customer.phone, customer.vehicle_no].filter(Boolean).join(' · ') || 'No contact details on file'}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Current due</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--critical)]">
            {Number(customer.current_due).toFixed(2)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Opening balance</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{Number(customer.opening_balance).toFixed(2)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Address</p>
          <p className="mt-2 text-sm text-[var(--ink)]">{customer.address || '—'}</p>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <p className="border-b border-[var(--line)] px-4 py-3 text-sm font-semibold">Invoice history</p>
        {customer.invoices?.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {customer.invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3">
                    <Link to={`/invoices/${inv.id}`} className="font-mono text-xs text-[var(--accent-2)] hover:underline">
                      {inv.invoice_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(inv.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(inv.due_amount).toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No invoices yet for this customer." />
        )}
      </Card>
    </div>
  )
}
