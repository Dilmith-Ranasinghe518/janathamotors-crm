import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { Bike, MessageCircle, Plus, Search, Truck, X } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, EmptyState, Input, Modal, PageHeader, Select } from '../components/ui'

const PARTNERS = [
  { value: 'pickme', label: 'PickMe', ride: true },
  { value: 'uber', label: 'Uber', ride: true },
  { value: 'dhl', label: 'DHL' },
  { value: 'prompt_xp', label: 'Prompt XP' },
  { value: 'pronto', label: 'Pronto' },
  { value: 'domex', label: 'Domex' },
]
const partnerLabel = (v) => PARTNERS.find((p) => p.value === v)?.label ?? v
const isRidePartner = (v) => Boolean(PARTNERS.find((p) => p.value === v)?.ride)

const VEHICLE_TYPES = [
  { value: 'bike', label: 'Bike' },
  { value: 'three_wheeler', label: '3 Wheeler' },
  { value: 'lorry', label: 'Lorry' },
]
const vehicleLabel = (v) => VEHICLE_TYPES.find((t) => t.value === v)?.label ?? v

const STATUSES = [
  { value: 'pending', label: 'Pending', style: 'bg-[var(--line)] text-[var(--muted)]' },
  { value: 'confirmed', label: 'Confirmed', style: 'bg-[var(--accent-soft)] text-[var(--accent)]' },
  { value: 'dispatched', label: 'Dispatched', style: 'bg-[var(--warning-soft)] text-[var(--warning)]' },
  { value: 'delivered', label: 'Delivered', style: 'bg-[var(--success-soft)] text-[var(--success)]' },
  { value: 'cancelled', label: 'Cancelled', style: 'bg-[var(--critical-soft)] text-[var(--critical)]' },
]
const statusStyle = (v) => STATUSES.find((s) => s.value === v)?.style ?? ''

const today = () => new Date().toISOString().slice(0, 10)

const emptyForm = {
  invoice_id: '',
  order_date: today(),
  shipping_partner: '',
  tracking_no: '',
  vehicle_type: '',
  vehicle_no: '',
  driver_name: '',
  driver_mobile: '',
  customer_name: '',
  customer_phone: '',
  shipping_address: '',
  status: 'pending',
  notes: '',
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

/** wa.me link for a Sri Lankan number (07X… → 947X…). */
function whatsappLink(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits.startsWith('0') ? `94${digits.slice(1)}` : digits}`
}

export function WhatsappOrdersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [partnerFilter, setPartnerFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [error, setError] = useState('')

  const ordersQuery = useQuery({
    queryKey: ['whatsapp-orders', search, statusFilter, partnerFilter],
    queryFn: () =>
      api
        .get('/whatsapp-orders', {
          params: {
            search: search || undefined,
            status: statusFilter || undefined,
            shipping_partner: partnerFilter || undefined,
          },
        })
        .then((r) => r.data),
  })
  const orders = ordersQuery.data?.data ?? []

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? api.put(`/whatsapp-orders/${editing.id}`, payload) : api.post('/whatsapp-orders', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-orders'] })
      closeForm()
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save the order.')),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/whatsapp-orders/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-orders'] }),
    onError: (err) => alert(apiErrorMessage(err, 'Could not update the status.')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/whatsapp-orders/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-orders'] }),
  })

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, order_date: today() })
    setSelectedInvoice(null)
    setError('')
    setFormOpen(true)
  }

  function openEdit(order) {
    setEditing(order)
    setForm({
      invoice_id: order.invoice_id ?? '',
      order_date: String(order.order_date ?? '').slice(0, 10),
      shipping_partner: order.shipping_partner,
      tracking_no: order.tracking_no ?? '',
      vehicle_type: order.vehicle_type ?? '',
      vehicle_no: order.vehicle_no ?? '',
      driver_name: order.driver_name ?? '',
      driver_mobile: order.driver_mobile ?? '',
      customer_name: order.customer_name ?? '',
      customer_phone: order.customer_phone ?? '',
      shipping_address: order.shipping_address ?? '',
      status: order.status,
      notes: order.notes ?? '',
    })
    setSelectedInvoice(order.invoice ?? null)
    setError('')
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
    setError('')
  }

  // Picking an invoice fills the customer details; anything already typed is kept.
  function handleSelectInvoice(invoice) {
    setSelectedInvoice(invoice)
    setForm((f) => ({
      ...f,
      invoice_id: invoice?.id ?? '',
      customer_name: f.customer_name || invoice?.customer?.name || invoice?.customer_name || '',
      customer_phone: f.customer_phone || invoice?.customer?.phone || invoice?.customer_phone || '',
      shipping_address: f.shipping_address || invoice?.customer?.address || '',
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.invoice_id) {
      setError('Please select an invoice.')
      return
    }
    const nullable = (v) => (v === '' ? null : v)
    saveMutation.mutate({
      ...form,
      tracking_no: nullable(form.tracking_no),
      vehicle_type: nullable(form.vehicle_type),
    })
  }

  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) })
  const ride = isRidePartner(form.shipping_partner)

  return (
    <div>
      <PageHeader
        title="WhatsApp Orders"
        description="Orders received through WhatsApp, linked to invoices and tracked through delivery."
        actions={
          <Button onClick={openCreate} className="flex items-center gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            <span>New Order</span>
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-64 sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            placeholder="Search order, invoice, customer, tracking…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="w-44">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select value={partnerFilter} onChange={(e) => setPartnerFilter(e.target.value)}>
            <option value="">All Partners</option>
            {PARTNERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <Card className="overflow-x-auto shadow-xs">
        {ordersQuery.isLoading ? (
          <p className="p-8 text-center text-sm text-[var(--muted)]">Loading orders…</p>
        ) : orders.length === 0 ? (
          <EmptyState message="No WhatsApp orders found." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)] bg-[var(--paper)]/50">
                <th className="px-4 py-3 whitespace-nowrap">Order No</th>
                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 whitespace-nowrap">Invoice</th>
                <th className="px-4 py-3 whitespace-nowrap">Customer</th>
                <th className="px-4 py-3 whitespace-nowrap">Shipping Address</th>
                <th className="px-4 py-3 whitespace-nowrap">Partner</th>
                <th className="px-4 py-3 whitespace-nowrap">Tracking / Driver</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const wa = whatsappLink(o.customer_phone)
                return (
                  <tr key={o.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)]/40 transition">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold whitespace-nowrap text-[var(--accent)]">{o.order_no}</td>
                    <td className="px-4 py-3.5 text-xs whitespace-nowrap">{formatDate(o.order_date)}</td>
                    <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                      {o.invoice ? (
                        <>
                          <div className="font-mono font-semibold text-[var(--ink)]">{o.invoice.invoice_no}</div>
                          <div className="text-[var(--muted)]">LKR {Number(o.invoice.total).toFixed(2)}</div>
                        </>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <div className="font-semibold text-[var(--ink)]">{o.customer_name}</div>
                      {o.customer_phone && (
                        wa ? (
                          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--success)] hover:underline">
                            <MessageCircle className="h-3 w-3" />{o.customer_phone}
                          </a>
                        ) : (
                          <div className="text-[var(--muted)]">{o.customer_phone}</div>
                        )
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--muted)] max-w-[220px]">
                      <span className="line-clamp-2">{o.shipping_address || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold whitespace-nowrap text-[var(--ink)]">{partnerLabel(o.shipping_partner)}</td>
                    <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                      {isRidePartner(o.shipping_partner) ? (
                        <>
                          <div className="flex items-center gap-1 font-semibold text-[var(--ink)]">
                            {o.vehicle_type === 'lorry' ? <Truck className="h-3 w-3" /> : <Bike className="h-3 w-3" />}
                            {vehicleLabel(o.vehicle_type)} {o.vehicle_no && <span className="font-mono">· {o.vehicle_no}</span>}
                          </div>
                          {(o.driver_name || o.driver_mobile) && (
                            <div className="text-[var(--muted)]">{[o.driver_name, o.driver_mobile].filter(Boolean).join(' · ')}</div>
                          )}
                        </>
                      ) : (
                        <span className="font-mono text-[var(--ink)]">{o.tracking_no || <span className="text-[var(--muted)]">—</span>}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={o.status}
                        onChange={(e) => statusMutation.mutate({ id: o.id, status: e.target.value })}
                        className={clsx('rounded-full border-0 px-2.5 py-1 text-xs font-bold outline-none cursor-pointer', statusStyle(o.status))}
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3 text-xs font-semibold">
                        <button onClick={() => openEdit(o)} className="text-[var(--accent-2)] hover:underline">Edit</button>
                        <button
                          onClick={() => confirm(`Delete order ${o.order_no}?`) && deleteMutation.mutate(o.id)}
                          className="text-[var(--critical)] hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {formOpen && (
        <Modal title={editing ? `Edit order ${editing.order_no}` : 'New WhatsApp order'} onClose={closeForm} wide>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {error && (
              <div className="col-span-2 rounded-lg bg-[var(--critical-soft)] p-3 text-xs font-semibold text-[var(--critical)]">{error}</div>
            )}

            <div className="col-span-2">
              <InvoicePicker selected={selectedInvoice} onSelect={handleSelectInvoice} />
            </div>

            <Input label="Order number" value={editing ? editing.order_no : 'Auto-generated on save'} disabled className="opacity-70" />
            <Input label="Order date *" type="date" required {...field('order_date')} />

            <div className="col-span-2 border-t border-[var(--line)] pt-3 text-sm font-bold text-[var(--ink)]">Customer details</div>
            <Input label="Customer name *" required {...field('customer_name')} />
            <Input label="Customer mobile (WhatsApp)" placeholder="07X XXX XXXX" {...field('customer_phone')} />
            <label className="col-span-2 flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--ink)]">Shipping address</span>
              <textarea
                rows={2}
                {...field('shipping_address')}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </label>

            <div className="col-span-2 border-t border-[var(--line)] pt-3 text-sm font-bold text-[var(--ink)]">Delivery</div>
            <Select label="Shipping partner *" required {...field('shipping_partner')}>
              <option value="">— Select Partner —</option>
              {PARTNERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </Select>
            <Select label="Status *" required {...field('status')}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>

            {ride ? (
              <>
                <Select label="Vehicle type *" required {...field('vehicle_type')}>
                  <option value="">— Select Vehicle —</option>
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
                <Input label="Vehicle number" placeholder="e.g. BHK-4521" {...field('vehicle_no')} />
                <Input label="Driver name" {...field('driver_name')} />
                <Input label="Driver mobile number" placeholder="07X XXX XXXX" {...field('driver_mobile')} />
              </>
            ) : (
              form.shipping_partner && <Input label="Tracking number" className="col-span-2" {...field('tracking_no')} />
            )}

            <label className="col-span-2 flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--ink)]">Notes</span>
              <textarea
                rows={2}
                {...field('notes')}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </label>

            <div className="col-span-2 flex justify-end gap-2 border-t border-[var(--line)] pt-3">
              <Button type="button" variant="secondary" onClick={closeForm}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : 'Save order'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

/** Searchable invoice selector (by invoice no, customer name or phone). */
function InvoicePicker({ selected, onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)

  const invoicesQuery = useQuery({
    queryKey: ['whatsapp-orders', 'invoices', query],
    queryFn: () => api.get('/whatsapp-orders/invoices', { params: { search: query || undefined } }).then((r) => r.data),
    enabled: open,
  })

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (selected) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--ink)]">Invoice *</span>
        <div className="flex items-center justify-between rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)]/40 px-3 py-2">
          <div>
            <span className="font-mono font-bold text-[var(--ink)]">{selected.invoice_no}</span>
            <span className="ml-2 text-xs text-[var(--muted)]">
              {selected.customer?.name || selected.customer_name || 'Walk-in'} · LKR {Number(selected.total).toFixed(2)}
            </span>
          </div>
          <button type="button" onClick={() => onSelect(null)} className="rounded p-1 text-[var(--muted)] hover:text-[var(--ink)]" title="Change invoice">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  const invoices = invoicesQuery.data ?? []
  return (
    <div ref={wrapperRef} className="relative flex flex-col gap-1 text-sm">
      <span className="font-medium text-[var(--ink)]">Invoice *</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search invoice no, customer name or phone…"
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] py-2 pl-9 pr-3 text-[var(--ink)] outline-none focus:border-[var(--accent)]"
        />
      </div>
      {open && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-2xl">
          {invoicesQuery.isLoading ? (
            <li className="px-3 py-2 text-xs text-[var(--muted)]">Loading…</li>
          ) : invoices.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[var(--muted)]">No invoices found.</li>
          ) : (
            invoices.map((inv) => (
              <li
                key={inv.id}
                onClick={() => {
                  onSelect(inv)
                  setOpen(false)
                  setQuery('')
                }}
                className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--accent-soft)]"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-[var(--ink)]">{inv.invoice_no}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {inv.customer?.name || inv.customer_name || 'Walk-in'}
                    {(inv.customer?.phone || inv.customer_phone) && ` · ${inv.customer?.phone || inv.customer_phone}`}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-mono font-bold text-[var(--accent)]">LKR {Number(inv.total).toFixed(2)}</div>
                  <div className="text-[var(--muted)]">{formatDate(inv.created_at)}</div>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
