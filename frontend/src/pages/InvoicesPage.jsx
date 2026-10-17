import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, FileDown, Pencil, Trash2, Plus, CreditCard, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import { Card, EmptyState, Input, PageHeader, Select, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const emptyFilters = { status: '', type: '', store_id: '', from: '', to: '' }

export function InvoicesPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(1)
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  function setFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  const hasFilters = search || Object.values(filters).some(Boolean)
  function clearFilters() {
    setSearch('')
    setDebouncedSearch('')
    setFilters(emptyFilters)
    setPage(1)
  }

  const storesQuery = useQuery({
    queryKey: ['stores', 'all'],
    queryFn: () => api.get('/stores', { params: { all: true } }).then((r) => r.data),
  })
  const stores = storesQuery.data?.data ?? []

  const invoicesQuery = useQuery({
    queryKey: ['invoices', debouncedSearch, filters, page],
    queryFn: () =>
      api
        .get('/invoices', {
          params: {
            page,
            search: debouncedSearch || undefined,
            status: filters.status || undefined,
            type: filters.type || undefined,
            store_id: filters.store_id || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
          },
        })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  })
  const meta = invoicesQuery.data

  const voidMutation = useMutation({
    mutationFn: (id) => api.post(`/invoices/${id}/void`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  const invoices = invoicesQuery.data?.data ?? []

  // type: 'normal' bill or 'vat' tax invoice
  async function openPdf(inv, type = 'normal') {
    setDownloadingId(`${inv.id}-${type}`)
    try {
      const response = await api.get(`/invoices/${inv.id}/pdf`, {
        params: { type: type === 'vat' ? 'vat' : undefined },
        responseType: 'blob',
      })
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
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/invoices/new?type=credit"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)] transition"
              >
                <CreditCard className="h-4 w-4" />
                <span>Create Credit Bill</span>
              </Link>
              <Link
                to="/invoices/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition shadow-md"
              >
                <Plus className="h-4 w-4" />
                <span>New Sales Invoice</span>
              </Link>
            </div>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice no, customer, phone, vehicle no…"
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="w-36">
          <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            <option value="due">Due</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        <div className="w-40">
          <Select value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
            <option value="">All bill types</option>
            <option value="regular">Sales invoices</option>
            <option value="credit">Credit bills</option>
          </Select>
        </div>
        <div className="w-44">
          <Select value={filters.store_id} onChange={(e) => setFilter('store_id', e.target.value)}>
            <option value="">All stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-36">
            <Input type="date" aria-label="From date" title="From date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
          </div>
          <span className="pb-2 text-xs text-[var(--muted)]">to</span>
          <div className="w-36">
            <Input type="date" aria-label="To date" title="To date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} />
          </div>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 pb-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      <Card className="overflow-x-auto">
        {invoicesQuery.isLoading ? (
          <p className="p-6 text-sm text-[var(--muted)]">Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <EmptyState message={hasFilters ? "No invoices match your search or filters." : "No invoices found."} />
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
                    {inv.is_credit && (
                      <span className="mt-1 block w-fit rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--warning)]">
                        Credit
                      </span>
                    )}
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
                        disabled={downloadingId === `${inv.id}-normal`}
                        className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs font-bold text-[var(--accent-2)] hover:bg-[var(--accent-soft)] transition shadow-2xs disabled:opacity-50"
                        title="Download bill (PDF)"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        <span>{downloadingId === `${inv.id}-normal` ? '…' : 'PDF'}</span>
                      </button>

                      {(inv.customer_tin || inv.customer?.tin) && (
                      <button
                        onClick={() => openPdf(inv, 'vat')}
                        disabled={downloadingId === `${inv.id}-vat`}
                        className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs font-bold text-[var(--accent-2)] hover:bg-[var(--accent-soft)] transition shadow-2xs disabled:opacity-50"
                        title="Download tax invoice / VAT bill (PDF)"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        <span>{downloadingId === `${inv.id}-vat` ? '…' : 'VAT Bill'}</span>
                      </button>
                      )}

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
        {meta && meta.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)]">
            <span>
              Showing <strong className="text-[var(--ink)]">{meta.from}–{meta.to}</strong> of{' '}
              <strong className="text-[var(--ink)]">{meta.total}</strong> {meta.total === 1 ? 'invoice' : 'invoices'}
            </span>
            {meta.last_page > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1.5 font-semibold text-[var(--ink)] hover:bg-[var(--paper)] disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <span>
                  Page {meta.current_page} of {meta.last_page}
                </span>
                <button
                  type="button"
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1.5 font-semibold text-[var(--ink)] hover:bg-[var(--paper)] disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
