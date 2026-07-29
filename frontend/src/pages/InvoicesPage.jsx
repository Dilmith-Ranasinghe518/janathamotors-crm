import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, FileDown, Pencil, Trash2, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { Card, EmptyState, PageHeader, Select, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export function InvoicesPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [downloadingId, setDownloadingId] = useState(null)

  const invoicesQuery = useQuery({
    queryKey: ['invoices', status],
    queryFn: () => api.get('/invoices', { params: { status: status || undefined } }).then((r) => r.data),
  })

  const voidMutation = useMutation({
    mutationFn: (id) => api.post(`/invoices/${id}/void`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  const invoices = invoicesQuery.data?.data ?? []

  async function openPdf(inv) {
    setDownloadingId(inv.id)
    try {
      const response = await api.get(`/invoices/${inv.id}/pdf`, { responseType: 'blob' })
      const file = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(file)
      window.open(url, '_blank')
    } finally {
      setDownloadingId(null)
    }
  }

  function handleVoid(inv) {
    if (window.confirm(`Are you sure you want to void invoice ${inv.invoice_no}? Stock will be restored.`)) {
      voidMutation.mutate(inv.id)
    }
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Create sales, track payments and dues."
        actions={
          can('create_invoice') && (
            <Link
              to="/invoices/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span>New Sales Invoice</span>
            </Link>
          )
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">All statuses</option>
          <option value="due">Due</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      <Card className="overflow-x-auto">
        {invoicesQuery.isLoading ? (
          <p className="p-6 text-sm text-[var(--muted)]">Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <EmptyState message="No invoices found." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-3">Invoice No</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Total (LKR)</th>
                <th className="px-4 py-3 text-right">Due (LKR)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)] transition">
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 font-mono text-xs font-extrabold text-[var(--ink)] shadow-2xs">
                      {inv.invoice_no}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--ink)]">
                    {inv.customer_name || inv.customer?.name || 'Walk-in Customer'}
                    {(inv.customer_phone || inv.customer?.phone) && (
                      <span className="block text-xs font-normal text-[var(--muted)]">📞 {inv.customer_phone || inv.customer?.phone}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-[var(--ink)]">
                    {Number(inv.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-[var(--critical)]">
                    {Number(inv.due_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs font-bold text-[var(--ink)] hover:bg-[var(--paper)] transition shadow-2xs"
                        title="View invoice details"
                      >
                        <Eye className="h-3.5 w-3.5 text-[var(--accent)]" />
                        <span>View</span>
                      </Link>

                      <button
                        onClick={() => openPdf(inv)}
                        disabled={downloadingId === inv.id}
                        className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs font-bold text-[var(--accent-2)] hover:bg-[var(--accent-soft)] transition shadow-2xs disabled:opacity-50"
                        title="Download PDF"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        <span>{downloadingId === inv.id ? '…' : 'PDF'}</span>
                      </button>

                      <Link
                        to={`/invoices/${inv.id}/edit`}
                        className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs font-bold text-[var(--ink)] hover:bg-[var(--paper)] transition shadow-2xs"
                        title="Edit Invoice"
                      >
                        <Pencil className="h-3.5 w-3.5 text-[var(--muted)]" />
                        <span>Edit</span>
                      </Link>

                      {inv.status !== 'cancelled' && can('void_invoice') && (
                        <button
                          onClick={() => handleVoid(inv)}
                          disabled={voidMutation.isPending}
                          className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs font-bold text-[var(--critical)] hover:bg-[var(--critical-soft)] transition shadow-2xs disabled:opacity-50"
                          title="Void / Delete invoice"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
