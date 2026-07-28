import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, Input, PageHeader, Select } from '../components/ui'

const blankLine = { product_id: '', quantity: 1, unit_price: '', discount: 0 }

export function InvoiceCreatePage() {
  const navigate = useNavigate()
  const [customerId, setCustomerId] = useState('')
  const [lines, setLines] = useState([{ ...blankLine }])
  const [discount, setDiscount] = useState('0')
  const [tax, setTax] = useState('0')
  const [paidAmount, setPaidAmount] = useState('0')
  const [error, setError] = useState('')

  const customersQuery = useQuery({ queryKey: ['customers', 'all'], queryFn: () => api.get('/customers').then((r) => r.data) })
  const productsQuery = useQuery({ queryKey: ['products', 'all'], queryFn: () => api.get('/products', { params: { search: '' } }).then((r) => r.data) })

  const products = productsQuery.data?.data ?? []
  const customers = customersQuery.data?.data ?? []

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0) - (Number(l.discount) || 0), 0),
    [lines]
  )
  const total = subtotal - (Number(discount) || 0) + (Number(tax) || 0)

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/invoices', payload),
    onSuccess: ({ data }) => navigate(`/invoices/${data.id}`),
    onError: (err) => setError(apiErrorMessage(err, 'Could not create the invoice.')),
  })

  function updateLine(index, patch) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function addLine() {
    setLines((prev) => [...prev, { ...blankLine }])
  }

  function removeLine(index) {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  function selectProduct(index, productId) {
    const product = products.find((p) => String(p.id) === String(productId))
    updateLine(index, { product_id: productId, unit_price: product?.selling_price ?? '' })
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const items = lines
      .filter((l) => l.product_id && Number(l.quantity) > 0)
      .map((l) => ({
        product_id: Number(l.product_id),
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        discount: Number(l.discount) || 0,
      }))

    if (items.length === 0) {
      setError('Add at least one line item.')
      return
    }

    createMutation.mutate({
      customer_id: customerId || null,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      paid_amount: Number(paidAmount) || 0,
      items,
    })
  }

  return (
    <div>
      <PageHeader title="New invoice" description="Line items deduct stock automatically on save." />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card className="p-5">
          <Select label="Customer (optional — leave blank for walk-in)" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Walk-in customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
            ))}
          </Select>
        </Card>

        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold text-[var(--ink)]">Items</p>
          <div className="flex flex-col gap-3">
            {lines.map((line, index) => {
              const product = products.find((p) => String(p.id) === String(line.product_id))
              return (
                <div key={index} className="grid grid-cols-12 items-end gap-2">
                  <Select
                    label="Product"
                    className="col-span-4"
                    value={line.product_id}
                    onChange={(e) => selectProduct(index, e.target.value)}
                  >
                    <option value="">Select product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.brand ? `[${p.brand.name}]` : ''} {p.vehicle_brand ? `(${p.vehicle_brand.name}${p.vehicle_model ? ' ' + p.vehicle_model.name : ''})` : ''} — {p.sku} (stock {p.stock_on_hand})
                      </option>
                    ))}
                  </Select>
                  <Input label="Qty" type="number" min="1" className="col-span-2" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} />
                  <Input label="Unit price" type="number" step="0.01" className="col-span-2" value={line.unit_price} onChange={(e) => updateLine(index, { unit_price: e.target.value })} />
                  <Input label="Discount" type="number" step="0.01" className="col-span-2" value={line.discount} onChange={(e) => updateLine(index, { discount: e.target.value })} />
                  <div className="col-span-1 pb-2 text-right text-sm tabular-nums text-[var(--muted)]">
                    {product && `≤${product.stock_on_hand}`}
                  </div>
                  <button type="button" onClick={() => removeLine(index)} className="col-span-1 pb-2 text-xs font-semibold text-[var(--critical)] hover:underline">
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
          <Button type="button" variant="secondary" onClick={addLine} className="mt-3">+ Add line</Button>
        </Card>

        <Card className="p-5">
          <div className="grid grid-cols-3 gap-4">
            <Input label="Invoice discount" type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            <Input label="Tax" type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
            <Input label="Paid now" type="number" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
          </div>
          <div className="mt-4 flex justify-end gap-8 border-t border-[var(--line)] pt-4 text-sm">
            <div>
              <p className="text-[var(--muted)]">Subtotal</p>
              <p className="font-semibold tabular-nums">{subtotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Total</p>
              <p className="text-lg font-bold tabular-nums">{total.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        {error && <p className="text-sm text-[var(--critical)]">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Saving…' : 'Create invoice'}
          </Button>
        </div>
      </form>
    </div>
  )
}
