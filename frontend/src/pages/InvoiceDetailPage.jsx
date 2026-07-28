import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, EmptyState, Input, Modal, PageHeader, Select, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export function InvoiceDetailPage() {
  const { id } = useParams()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [payOpen, setPayOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => api.get(`/invoices/${id}`).then((r) => r.data),
  })

  const payMutation = useMutation({
    mutationFn: (payload) => api.post(`/invoices/${id}/payments`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', id] })
      setPayOpen(false)
      setAmount('')
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not record payment.')),
  })

  const voidMutation = useMutation({
    mutationFn: () => api.post(`/invoices/${id}/void`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices', id] }),
  })

  async function downloadPdf() {
    setDownloading(true)
    try {
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `${invoice.invoice_no}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  if (isLoading) return <p className="text-sm text-[var(--muted)]">Loading…</p>
  if (!invoice) return <EmptyState message="Invoice not found." />

  return (
    <div>
      <PageHeader
        title={invoice.invoice_no}
        description={`Created ${new Date(invoice.created_at).toLocaleString()}`}
        actions={
          <>
            <Button variant="secondary" onClick={downloadPdf} disabled={downloading}>
              {downloading ? 'Preparing…' : 'Download PDF'}
            </Button>
            {invoice.due_amount > 0 && invoice.status !== 'cancelled' && can('create_invoice') && (
              <Button onClick={() => setPayOpen(true)}>Record payment</Button>
            )}
            {invoice.status !== 'cancelled' && can('void_invoice') && (
              <Button variant="danger" onClick={() => window.confirm('Void this invoice and restore stock?') && voidMutation.mutate()}>
                Void invoice
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase text-[var(--muted)]">Status</p>
          <div className="mt-2"><StatusBadge status={invoice.status} /></div>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-[var(--muted)]">Total</p>
          <p className="mt-2 text-lg font-bold tabular-nums">{Number(invoice.total).toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-[var(--muted)]">Paid</p>
          <p className="mt-2 text-lg font-bold tabular-nums text-[var(--success)]">{Number(invoice.paid_amount).toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-[var(--muted)]">Due</p>
          <p className="mt-2 text-lg font-bold tabular-nums text-[var(--critical)]">{Number(invoice.due_amount).toFixed(2)}</p>
        </Card>
      </div>

      <Card className="mb-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-[var(--muted)]">Customer</p>
            <p className="text-base font-semibold text-[var(--ink)]">
              {invoice.customer ? (
                <Link to={`/customers/${invoice.customer.id}`} className="text-[var(--accent-2)] hover:underline">
                  {invoice.customer_name || invoice.customer.name}
                </Link>
              ) : (
                invoice.customer_name || 'Walk-in Customer'
              )}
              {(invoice.customer_phone || invoice.customer?.phone) && (
                <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                  📞 {invoice.customer_phone || invoice.customer?.phone}
                </span>
              )}
            </p>
          </div>

          {(invoice.vehicle_no || invoice.vehicle_model || invoice.vehicle_year) && (
            <div className="rounded-lg bg-[var(--paper)] px-4 py-2 border border-[var(--line)] text-xs">
              <span className="font-bold text-[var(--ink)] block mb-0.5">Vehicle Information</span>
              <div className="flex flex-wrap items-center gap-3 text-[var(--muted)]">
                {invoice.vehicle_no && <span>Reg No: <strong className="font-mono text-[var(--accent)]">{invoice.vehicle_no}</strong></span>}
                {invoice.vehicle_model && <span>Model: <strong className="text-[var(--ink)]">{invoice.vehicle_model}</strong></span>}
                {invoice.vehicle_year && <span>Year: <strong className="text-[var(--ink)]">{invoice.vehicle_year}</strong></span>}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Unit price</th>
              <th className="px-4 py-3 text-right">Discount</th>
              <th className="px-4 py-3 text-right">Line total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-4 py-3">{item.product.name} <span className="text-xs text-[var(--muted)]">({item.product.sku})</span></td>
                <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                <td className="px-4 py-3 text-right tabular-nums">{Number(item.unit_price).toFixed(2)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{Number(item.discount).toFixed(2)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{Number(item.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto">
        <p className="border-b border-[var(--line)] px-4 py-3 text-sm font-semibold">Payments</p>
        {invoice.payments?.length ? (
          <table className="w-full text-sm">
            <tbody>
              {invoice.payments.map((p) => (
                <tr key={p.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3">{new Date(p.paid_at).toLocaleString()}</td>
                  <td className="px-4 py-3 capitalize">{p.method.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(p.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No payments recorded yet." />
        )}
      </Card>

      {payOpen && (
        <Modal title="Record payment" onClose={() => setPayOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              payMutation.mutate({ amount: Number(amount), method })
            }}
            className="flex flex-col gap-4"
          >
            <p className="text-sm text-[var(--muted)]">Outstanding due: {Number(invoice.due_amount).toFixed(2)}</p>
            <Input label="Amount" type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Select label="Method" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </Select>
            {error && <p className="text-sm text-[var(--critical)]">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setPayOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={payMutation.isPending}>Save payment</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
