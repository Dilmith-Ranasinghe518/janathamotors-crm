import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { CalendarClock, Hash, MapPin, Package, Plus, Search, Ship, Truck } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Input, Modal, PageHeader, Select } from '../components/ui'

const COLUMNS = [
  { status: 'ordered', label: 'Ordered', dot: 'bg-[var(--muted)]' },
  { status: 'shipped', label: 'Shipped', dot: 'bg-[var(--accent-2)]' },
  { status: 'in_transit', label: 'In Transit', dot: 'bg-[var(--warning)]' },
  { status: 'customs', label: 'At Port / Customs', dot: 'bg-[var(--accent)]' },
  { status: 'delivered', label: 'Delivered', dot: 'bg-[var(--success)]' },
]

const emptyForm = {
  title: '',
  supplier_id: '',
  store_id: '',
  carrier: '',
  tracking_no: '',
  origin: '',
  status: 'ordered',
  order_date: new Date().toISOString().slice(0, 10),
  shipped_date: '',
  eta: '',
  arrived_date: '',
  packages: '',
  freight_cost: '',
  notes: '',
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : ''
}

/** Days until ETA (negative = overdue), or null when there is no ETA. */
function daysUntil(value) {
  if (!value) return null
  const today = new Date(new Date().toISOString().slice(0, 10))
  return Math.round((new Date(dateOnly(value)) - today) / 86400000)
}

export function ShipmentsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(null)

  const queryKey = ['shipments', search, supplierFilter]
  const shipmentsQuery = useQuery({
    queryKey,
    queryFn: () =>
      api
        .get('/shipments', { params: { search: search || undefined, supplier_id: supplierFilter || undefined } })
        .then((r) => r.data.data),
  })
  const suppliersQuery = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => api.get('/suppliers', { params: { per_page: 500 } }).then((r) => r.data.data),
  })
  const storesQuery = useQuery({
    queryKey: ['stores', 'all'],
    queryFn: () => api.get('/stores', { params: { all: true } }).then((r) => r.data),
  })

  const shipments = shipmentsQuery.data ?? []
  const suppliers = suppliersQuery.data ?? []
  const stores = storesQuery.data?.data ?? []

  const saveMutation = useMutation({
    mutationFn: (payload) => (editing ? api.put(`/shipments/${editing.id}`, payload) : api.post('/shipments', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      closeForm()
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save the shipment.')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/shipments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      closeForm()
    },
  })

  // Optimistic: the card jumps to the new column immediately and rolls back if the save fails.
  const moveMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/shipments/${id}/move`, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old = []) => old.map((s) => (s.id === id ? { ...s, status } : s)))
      return { previous }
    },
    onError: (err, _vars, context) => {
      queryClient.setQueryData(queryKey, context.previous)
      alert(apiErrorMessage(err, 'Could not move the shipment.'))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['shipments'] }),
  })

  function openCreate(status = 'ordered') {
    setEditing(null)
    setForm({ ...emptyForm, status })
    setError('')
    setFormOpen(true)
  }

  function openEdit(shipment) {
    setEditing(shipment)
    setForm({
      title: shipment.title,
      supplier_id: shipment.supplier_id ?? '',
      store_id: shipment.store_id ?? '',
      carrier: shipment.carrier ?? '',
      tracking_no: shipment.tracking_no ?? '',
      origin: shipment.origin ?? '',
      status: shipment.status,
      order_date: dateOnly(shipment.order_date),
      shipped_date: dateOnly(shipment.shipped_date),
      eta: dateOnly(shipment.eta),
      arrived_date: dateOnly(shipment.arrived_date),
      packages: shipment.packages ?? '',
      freight_cost: shipment.freight_cost ?? '',
      notes: shipment.notes ?? '',
    })
    setError('')
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
    setError('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const nullable = (v) => (v === '' ? null : v)
    saveMutation.mutate({
      ...form,
      supplier_id: nullable(form.supplier_id),
      store_id: nullable(form.store_id),
      order_date: nullable(form.order_date),
      shipped_date: nullable(form.shipped_date),
      eta: nullable(form.eta),
      arrived_date: nullable(form.arrived_date),
      packages: nullable(form.packages),
      freight_cost: nullable(form.freight_cost),
    })
  }

  function handleDrop(e, status) {
    e.preventDefault()
    setDragOver(null)
    const id = Number(e.dataTransfer.getData('text/plain'))
    const shipment = shipments.find((s) => s.id === id)
    if (shipment && shipment.status !== status) moveMutation.mutate({ id, status })
  }

  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) })

  return (
    <div>
      <PageHeader
        title="Shipments"
        description="Track incoming shipments from order to delivery. Drag cards between columns to update their status."
        actions={
          <Button onClick={() => openCreate()} className="flex items-center gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            <span>New Shipment</span>
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-64 sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            placeholder="Search shipment, tracking no, carrier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="w-48 sm:w-60">
          <Select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
      </div>

      {shipmentsQuery.isLoading ? (
        <p className="p-8 text-center text-sm text-[var(--muted)]">Loading shipments…</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const cards = shipments.filter((s) => s.status === col.status)
            return (
              <div
                key={col.status}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(col.status)
                }}
                onDragLeave={() => setDragOver((cur) => (cur === col.status ? null : cur))}
                onDrop={(e) => handleDrop(e, col.status)}
                className={clsx(
                  'flex w-72 shrink-0 flex-col rounded-2xl border bg-[var(--paper)] p-3 transition',
                  dragOver === col.status ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40' : 'border-[var(--line)]'
                )}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={clsx('h-2.5 w-2.5 rounded-full', col.dot)} />
                    <span className="text-sm font-bold text-[var(--ink)]">{col.label}</span>
                    <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs font-semibold text-[var(--muted)] border border-[var(--line)]">
                      {cards.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openCreate(col.status)}
                    className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                    title={`Add shipment to ${col.label}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex min-h-[120px] flex-1 flex-col gap-2.5">
                  {cards.map((s) => (
                    <ShipmentCard key={s.id} shipment={s} onOpen={() => openEdit(s)} />
                  ))}
                  {cards.length === 0 && (
                    <p className="rounded-xl border border-dashed border-[var(--line)] py-6 text-center text-xs text-[var(--muted)]">
                      Drop shipments here
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {formOpen && (
        <Modal title={editing ? `Shipment ${editing.shipment_no}` : 'New shipment'} onClose={closeForm} wide>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {error && (
              <div className="col-span-2 rounded-lg bg-[var(--critical-soft)] p-3 text-xs font-semibold text-[var(--critical)]">{error}</div>
            )}
            <Input label="Shipment description *" required placeholder="e.g. Brake pads & filters — March order" className="col-span-2" {...field('title')} />

            <Select label="Supplier" {...field('supplier_id')}>
              <option value="">— Select Supplier —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            <Select label="Destination Store" {...field('store_id')}>
              <option value="">— Select Store —</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </Select>

            <Input label="Carrier / Forwarder" placeholder="e.g. DHL, Maersk" {...field('carrier')} />
            <Input label="Tracking / BL / Container No" {...field('tracking_no')} />

            <Input label="Origin" placeholder="e.g. Japan, Malaysia" {...field('origin')} />
            <Select label="Status *" required {...field('status')}>
              {COLUMNS.map((c) => (
                <option key={c.status} value={c.status}>{c.label}</option>
              ))}
            </Select>

            <Input label="Order date" type="date" {...field('order_date')} />
            <Input label="Shipped date" type="date" {...field('shipped_date')} />
            <Input label="Expected arrival (ETA)" type="date" {...field('eta')} />
            <Input label="Arrived date" type="date" {...field('arrived_date')} />

            <Input label="Packages / Cartons" type="number" min="0" {...field('packages')} />
            <Input label="Freight cost (LKR)" type="number" step="0.01" min="0" {...field('freight_cost')} />

            <label className="col-span-2 flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--ink)]">Notes</span>
              <textarea
                rows={3}
                placeholder="Items included, invoice refs, clearing agent, etc."
                {...field('notes')}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </label>

            {editing && (
              <p className="col-span-2 text-xs text-[var(--muted)]">
                Added {formatDate(editing.created_at)}{editing.creator ? ` by ${editing.creator.name}` : ''}
              </p>
            )}

            <div className="col-span-2 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
              <div>
                {editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-[var(--critical)]"
                    disabled={deleteMutation.isPending}
                    onClick={() => confirm(`Delete shipment ${editing.shipment_no}?`) && deleteMutation.mutate(editing.id)}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={closeForm}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving…' : 'Save shipment'}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function ShipmentCard({ shipment: s, onOpen }) {
  const days = s.status === 'delivered' ? null : daysUntil(s.eta)
  const overdue = days !== null && days < 0

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(s.id))
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={onOpen}
      className={clsx(
        'cursor-grab rounded-xl border bg-[var(--surface)] p-3 shadow-xs transition hover:shadow-md active:cursor-grabbing',
        overdue ? 'border-[var(--critical)]' : 'border-[var(--line)] hover:border-[var(--accent)]'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-bold text-[var(--accent)]">{s.shipment_no}</span>
        {s.eta && s.status !== 'delivered' && (
          <span
            className={clsx(
              'rounded-full px-2 py-0.5 text-[10px] font-bold',
              overdue
                ? 'bg-[var(--critical-soft)] text-[var(--critical)]'
                : days <= 3
                  ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                  : 'bg-[var(--paper)] text-[var(--muted)]'
            )}
          >
            {overdue ? `${-days}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
          </span>
        )}
        {s.status === 'delivered' && s.arrived_date && (
          <span className="rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">
            {formatDate(s.arrived_date)}
          </span>
        )}
      </div>

      <p className="mt-1.5 text-sm font-semibold leading-snug text-[var(--ink)]">{s.title}</p>

      <div className="mt-2 space-y-1 text-[11px] text-[var(--muted)]">
        {s.supplier && (
          <div className="flex items-center gap-1.5"><Truck className="h-3 w-3 shrink-0" /> {s.supplier.name}</div>
        )}
        {(s.carrier || s.tracking_no) && (
          <div className="flex items-center gap-1.5">
            <Ship className="h-3 w-3 shrink-0" />
            <span>{s.carrier}</span>
            {s.tracking_no && <span className="flex items-center gap-0.5 font-mono text-[var(--ink)]"><Hash className="h-2.5 w-2.5" />{s.tracking_no}</span>}
          </div>
        )}
        {(s.origin || s.store) && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {[s.origin, s.store?.code].filter(Boolean).join(' → ')}
          </div>
        )}
        <div className="flex items-center justify-between pt-0.5">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-3 w-3 shrink-0" /> ETA {formatDate(s.eta)}
          </span>
          {s.packages ? (
            <span className="flex items-center gap-1"><Package className="h-3 w-3" />{s.packages}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
