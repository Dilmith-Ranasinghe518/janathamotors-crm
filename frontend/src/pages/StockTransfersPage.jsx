import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ArrowLeftRight, Plus, Search, Eye, Trash2, Calendar, MapPin, Store, CheckCircle2 } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, EmptyState, Input, Modal, PageHeader, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const blankLine = { product_id: '', quantity: 1, notes: '' }

export function StockTransfersPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [filterFromStore, setFilterFromStore] = useState('')
  const [filterToStore, setFilterToStore] = useState('')
  
  const [modalOpen, setModalOpen] = useState(false)
  const [detailTransfer, setDetailTransfer] = useState(null)
  
  const [fromStoreId, setFromStoreId] = useState('')
  const [toStoreId, setToStoreId] = useState('')
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([{ ...blankLine }])
  const [error, setError] = useState('')

  const storesQuery = useQuery({
    queryKey: ['stores', 'all'],
    queryFn: () => api.get('/stores', { params: { all: true } }).then((r) => r.data),
  })

  const productsQuery = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => api.get('/products', { params: { per_page: 200 } }).then((r) => r.data),
  })

  const transfersQuery = useQuery({
    queryKey: ['stock-transfers', search, filterFromStore, filterToStore],
    queryFn: () =>
      api
        .get('/stock-transfers', {
          params: {
            search: search || undefined,
            from_store_id: filterFromStore || undefined,
            to_store_id: filterToStore || undefined,
          },
        })
        .then((r) => r.data),
  })

  const stores = storesQuery.data?.data ?? []
  const products = productsQuery.data?.data ?? []
  const transfers = transfersQuery.data?.data ?? []

  const createTransferMutation = useMutation({
    mutationFn: (payload) => api.post('/stock-transfers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      closeCreateModal()
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not execute stock transfer.')),
  })

  function openCreateModal() {
    setFromStoreId('')
    setToStoreId('')
    setTransferDate(new Date().toISOString().slice(0, 10))
    setNotes('')
    setLines([{ ...blankLine }])
    setError('')
    setModalOpen(true)
  }

  function closeCreateModal() {
    setModalOpen(false)
    setError('')
  }

  function addLine() {
    setLines((prev) => [...prev, { ...blankLine }])
  }

  function updateLine(index, patch) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function removeLine(index) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ ...blankLine }]))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!fromStoreId) {
      setError('Please select a Source Store (From).')
      return
    }

    if (!toStoreId) {
      setError('Please select a Destination Store (To).')
      return
    }

    if (fromStoreId === toStoreId) {
      setError('Source and Destination stores must be different.')
      return
    }

    const validItems = lines
      .filter((l) => l.product_id && Number(l.quantity) > 0)
      .map((l) => ({
        product_id: Number(l.product_id),
        quantity: Number(l.quantity),
        notes: l.notes || null,
      }))

    if (validItems.length === 0) {
      setError('Please add at least one item line with a valid product and quantity.')
      return
    }

    createTransferMutation.mutate({
      from_store_id: Number(fromStoreId),
      to_store_id: Number(toStoreId),
      transferred_at: transferDate,
      notes: notes || null,
      items: validItems,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Transfers"
        description="Transfer inventory items between store locations and view transfer audit history."
        actions={
          can('manage_stock') && (
            <Button onClick={openCreateModal} className="flex items-center gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>New Stock Transfer</span>
            </Button>
          )
        }
      />

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search transfer no or store..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--accent)] transition"
            />
          </div>

          <Select
            value={filterFromStore}
            onChange={(e) => setFilterFromStore(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="">All Source Stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                From: {s.name} ({s.code})
              </option>
            ))}
          </Select>

          <Select
            value={filterToStore}
            onChange={(e) => setFilterToStore(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="">All Destination Stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                To: {s.name} ({s.code})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Transfers History Table */}
      <Card className="overflow-x-auto">
        {transfersQuery.isLoading ? (
          <p className="p-8 text-center text-sm text-[var(--muted)]">Loading stock transfer history...</p>
        ) : transfers.length === 0 ? (
          <EmptyState message="No stock transfer records found." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-3">Transfer No</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">From Store (Source)</th>
                <th className="px-4 py-3 text-center"></th>
                <th className="px-4 py-3">To Store (Destination)</th>
                <th className="px-4 py-3 text-center">Items</th>
                <th className="px-4 py-3">Transferred By</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => {
                const totalItemsCount = t.items?.length ?? 0
                const totalQtySum = t.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) ?? 0

                return (
                  <tr key={t.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)]/50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-[var(--ink)]">{t.transfer_no}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)] whitespace-nowrap">
                      {new Date(t.transferred_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--ink)]">
                        <Store className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>{t.from_store?.name}</span>
                        <span className="font-mono text-[10px] text-[var(--muted)]">({t.from_store?.code})</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ArrowRight className="h-4 w-4 text-[var(--accent)] mx-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--ink)]">
                        <Store className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{t.to_store?.name}</span>
                        <span className="font-mono text-[10px] text-[var(--muted)]">({t.to_store?.code})</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--accent)]">
                        {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} ({totalQtySum} qty)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">
                      {t.creator?.name ?? 'System'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        className="px-2.5 py-1 text-xs flex items-center gap-1 ml-auto"
                        onClick={() => setDetailTransfer(t)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Details</span>
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* New Stock Transfer Modal */}
      {modalOpen && (
        <Modal title="Create New Stock Transfer" onClose={closeCreateModal} wide>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-[var(--critical-soft)] p-3 text-xs font-semibold text-[var(--critical)]">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Select
                label="Source Store (From) *"
                value={fromStoreId}
                onChange={(e) => setFromStoreId(e.target.value)}
                required
              >
                <option value="">— Select Source Store —</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) - {s.location}
                  </option>
                ))}
              </Select>

              <Select
                label="Destination Store (To) *"
                value={toStoreId}
                onChange={(e) => setToStoreId(e.target.value)}
                required
              >
                <option value="">— Select Destination Store —</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id} disabled={String(s.id) === String(fromStoreId)}>
                    {s.name} ({s.code}) - {s.location}
                  </option>
                ))}
              </Select>

              <Input
                label="Transfer Date *"
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                required
              />
            </div>

            {/* Item Transfer Lines */}
            <div className="space-y-3 border-t border-[var(--line)] pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--ink)]">Transfer Items List</span>
                <Button type="button" variant="secondary" onClick={addLine} className="px-2.5 py-1 text-xs">
                  + Add Line
                </Button>
              </div>

              {lines.map((line, idx) => (
                <div key={idx} className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3">
                  <div className="flex-1 min-w-[220px]">
                    <Select
                      label={`Item ${idx + 1} *`}
                      value={line.product_id}
                      onChange={(e) => updateLine(idx, { product_id: e.target.value })}
                      required
                    >
                      <option value="">— Select Inventory Product —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} | {p.name} (Stock: {p.stock_on_hand})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="w-28">
                    <Input
                      label="Quantity *"
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                      required
                    />
                  </div>

                  <div className="flex-1 min-w-[150px]">
                    <Input
                      label="Notes"
                      placeholder="Optional line note..."
                      value={line.notes}
                      onChange={(e) => updateLine(idx, { notes: e.target.value })}
                    />
                  </div>

                  {lines.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      className="px-2.5 py-2"
                      onClick={() => removeLine(idx)}
                      title="Remove Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <label className="flex flex-col gap-1 text-sm pt-2">
              <span className="font-medium text-[var(--ink)]">Transfer Notes / Reason</span>
              <textarea
                rows={2}
                placeholder="Operational notes, driver name, vehicle info, or transfer reason..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--line)]">
              <Button type="button" variant="secondary" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTransferMutation.isPending}>
                {createTransferMutation.isPending ? 'Processing Transfer...' : 'Complete Transfer'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Transfer Detail Modal */}
      {detailTransfer && (
        <Modal title={`Transfer Details — ${detailTransfer.transfer_no}`} onClose={() => setDetailTransfer(null)} wide>
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Source Store (From)</p>
                <p className="font-bold text-sm text-[var(--ink)] mt-1">{detailTransfer.from_store?.name}</p>
                <p className="text-xs text-[var(--muted)] font-mono">{detailTransfer.from_store?.code} - {detailTransfer.from_store?.location}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Destination Store (To)</p>
                <p className="font-bold text-sm text-[var(--ink)] mt-1">{detailTransfer.to_store?.name}</p>
                <p className="text-xs text-[var(--muted)] font-mono">{detailTransfer.to_store?.code} - {detailTransfer.to_store?.location}</p>
              </div>

              <div className="border-t border-[var(--line)] pt-2 mt-2 sm:border-0 sm:pt-0 sm:mt-0">
                <p className="text-xs text-[var(--muted)]">Transfer Date</p>
                <p className="font-medium text-xs text-[var(--ink)]">{new Date(detailTransfer.transferred_at).toLocaleDateString('en-GB')}</p>
              </div>

              <div className="border-t border-[var(--line)] pt-2 mt-2 sm:border-0 sm:pt-0 sm:mt-0">
                <p className="text-xs text-[var(--muted)]">Created By</p>
                <p className="font-medium text-xs text-[var(--ink)]">{detailTransfer.creator?.name ?? 'System Admin'}</p>
              </div>
            </div>

            {detailTransfer.notes && (
              <div className="rounded-lg bg-[var(--surface)] border border-[var(--line)] p-3 text-xs text-[var(--ink)]">
                <span className="font-bold">Remarks: </span>
                <span>{detailTransfer.notes}</span>
              </div>
            )}

            <div>
              <p className="text-sm font-bold mb-2">Transferred Items Breakdown</p>
              <div className="rounded-xl border border-[var(--line)] overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--paper)] border-b border-[var(--line)] text-left uppercase text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Product Name</th>
                      <th className="px-3 py-2 text-right">Quantity</th>
                      <th className="px-3 py-2">Line Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailTransfer.items?.map((item, i) => (
                      <tr key={i} className="border-b border-[var(--line)] last:border-0">
                        <td className="px-3 py-2 font-mono">{item.product?.sku}</td>
                        <td className="px-3 py-2 font-semibold text-[var(--ink)]">{item.product?.name}</td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums text-[var(--accent)]">{item.quantity} {item.product?.unit}</td>
                        <td className="px-3 py-2 text-[var(--muted)]">{item.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setDetailTransfer(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
