import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, EmptyState, Input, Modal, PageHeader, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const emptySupplier = { name: '', phone: '', email: '', address: '' }
const blankLine = { product_id: '', quantity: 1, unit_cost: '' }

export function SuppliersPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [supplierFormOpen, setSupplierFormOpen] = useState(false)
  const [supplierForm, setSupplierForm] = useState(emptySupplier)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [purchaseSupplierId, setPurchaseSupplierId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState([{ ...blankLine }])
  const [error, setError] = useState('')

  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers').then((r) => r.data) })
  const purchasesQuery = useQuery({ queryKey: ['purchases'], queryFn: () => api.get('/purchases').then((r) => r.data) })
  const productsQuery = useQuery({ queryKey: ['products', 'all'], queryFn: () => api.get('/products').then((r) => r.data) })

  const suppliers = suppliersQuery.data?.data ?? []
  const purchases = purchasesQuery.data?.data ?? []
  const products = productsQuery.data?.data ?? []

  const totalPurchaseCost = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0),
    0
  )

  const saveSupplierMutation = useMutation({
    mutationFn: (payload) => api.post('/suppliers', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setSupplierFormOpen(false)
      setSupplierForm(emptySupplier)
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save supplier.')),
  })

  const createPurchaseMutation = useMutation({
    mutationFn: (payload) => api.post('/purchases', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setPurchaseOpen(false)
      setLines([{ ...blankLine }])
      setPurchaseSupplierId('')
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not record purchase.')),
  })

  function updateLine(index, patch) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function removeLine(index) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ ...blankLine }]))
  }

  function submitPurchase(e) {
    e.preventDefault()
    setError('')
    const items = lines
      .filter((l) => l.product_id && Number(l.quantity) > 0)
      .map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity), unit_cost: Number(l.unit_cost) }))

    if (!purchaseSupplierId || items.length === 0) {
      setError('Choose a supplier and add at least one valid item line.')
      return
    }

    createPurchaseMutation.mutate({ supplier_id: Number(purchaseSupplierId), purchased_at: purchaseDate, items })
  }

  return (
    <div>
      <PageHeader
        title="Suppliers & Purchases"
        description="Restock inventory and manage supplier records."
        actions={
          can('manage_suppliers') && (
            <>
              <Button variant="secondary" onClick={() => setSupplierFormOpen(true)}>+ New supplier</Button>
              <Button onClick={() => setPurchaseOpen(true)}>+ New purchase (stock in)</Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-x-auto">
          <p className="border-b border-[var(--line)] px-4 py-3 text-sm font-semibold">Suppliers</p>
          {suppliers.length === 0 ? (
            <EmptyState message="No suppliers registered yet." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-3">Supplier Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{s.phone || '—'}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{s.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="overflow-x-auto">
          <p className="border-b border-[var(--line)] px-4 py-3 text-sm font-semibold">Recent Purchases (Stock In)</p>
          {purchases.length === 0 ? (
            <EmptyState message="No purchases recorded yet." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3 text-right">Total (LKR)</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{p.reference_no}</td>
                    <td className="px-4 py-3 font-medium">{p.supplier?.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold">
                      {Number(p.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {supplierFormOpen && (
        <Modal title="New Supplier" onClose={() => setSupplierFormOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              saveSupplierMutation.mutate(supplierForm)
            }}
            className="flex flex-col gap-4"
          >
            <Input label="Supplier / Company Name" required value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
            <Input label="Phone Number" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
            <Input label="Email Address" type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
            <Input label="Address" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} />
            {error && <p className="text-sm text-[var(--critical)]">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setSupplierFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveSupplierMutation.isPending}>Save Supplier</Button>
            </div>
          </form>
        </Modal>
      )}

      {purchaseOpen && (
        <Modal title="New Purchase (Stock In)" onClose={() => setPurchaseOpen(false)} wide>
          <form onSubmit={submitPurchase} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Supplier" required value={purchaseSupplierId} onChange={(e) => setPurchaseSupplierId(e.target.value)}>
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <Input label="Purchase Date" type="date" required value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Purchased Items</label>
              {lines.map((line, index) => {
                const lineTotal = (Number(line.quantity) || 0) * (Number(line.unit_cost) || 0)
                return (
                  <div key={index} className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 shadow-xs">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <Select
                        label="Product / Part"
                        className="col-span-12 md:col-span-6"
                        value={line.product_id}
                        onChange={(e) => {
                          const prod = products.find((p) => String(p.id) === String(e.target.value))
                          updateLine(index, {
                            product_id: e.target.value,
                            unit_cost: prod ? prod.cost_price : line.unit_cost,
                          })
                        }}
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.brand ? `[${p.brand.name}]` : ''} — {p.sku} (Current Stock: {p.stock_on_hand})
                          </option>
                        ))}
                      </Select>

                      <Input
                        label="Qty"
                        className="col-span-5 md:col-span-2"
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, { quantity: e.target.value })}
                      />

                      <Input
                        label="Unit Cost (LKR)"
                        className="col-span-5 md:col-span-3"
                        type="number"
                        step="0.01"
                        placeholder="Unit Cost"
                        value={line.unit_cost}
                        onChange={(e) => updateLine(index, { unit_cost: e.target.value })}
                      />

                      <div className="col-span-2 md:col-span-1 flex items-center justify-end pb-2">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="rounded-lg p-2 text-xs font-bold text-[var(--critical)] hover:bg-[var(--critical-soft)] transition"
                          title="Remove line"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {lineTotal > 0 && (
                      <div className="text-right text-xs font-mono text-[var(--muted)] pt-1 border-t border-[var(--line)]">
                        Line Total: <strong className="text-[var(--ink)]">LKR {lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <Button type="button" variant="secondary" onClick={() => setLines((prev) => [...prev, { ...blankLine }])}>
              + Add Item Line
            </Button>

            <div className="flex items-center justify-between rounded-xl bg-[var(--accent-soft)] p-3 text-sm font-bold text-[var(--accent)] border border-[var(--accent)]/20">
              <span>Total Purchase Cost:</span>
              <span className="font-mono text-base font-black">
                LKR {totalPurchaseCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {error && <p className="text-sm font-semibold text-[var(--critical)]">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-[var(--line)] pt-4">
              <Button type="button" variant="secondary" onClick={() => setPurchaseOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createPurchaseMutation.isPending}>Save Purchase (Restock)</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
