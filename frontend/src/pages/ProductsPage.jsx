import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, EmptyState, Input, Modal, PageHeader, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const emptyForm = {
  sku: '', name: '', category_id: '', brand_id: '', vehicle_brand_id: '', vehicle_model_id: '', compatible_models: '',
  cost_price: '', selling_price: '', unit: 'pc', reorder_level: 5,
}

export function ProductsPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [adjusting, setAdjusting] = useState(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [error, setError] = useState('')

  const productsQuery = useQuery({
    queryKey: ['products', search, lowStockOnly],
    queryFn: () =>
      api
        .get('/products', { params: { search: search || undefined, low_stock: lowStockOnly || undefined } })
        .then((r) => r.data),
  })

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then((r) => r.data) })
  const brandsQuery = useQuery({ queryKey: ['brands'], queryFn: () => api.get('/brands').then((r) => r.data) })
  const vehicleBrandsQuery = useQuery({ queryKey: ['vehicle-brands'], queryFn: () => api.get('/vehicle-brands').then((r) => r.data) })
  const vehicleModelsQuery = useQuery({ queryKey: ['vehicle-models'], queryFn: () => api.get('/vehicle-models').then((r) => r.data) })

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? api.put(`/products/${editing.id}`, payload) : api.post('/products', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      closeForm()
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save the product.')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })

  const adjustMutation = useMutation({
    mutationFn: ({ id, quantity }) => api.post(`/products/${id}/adjust-stock`, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setAdjusting(null)
      setAdjustQty('')
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not adjust stock.')),
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setFormOpen(true)
  }

  function openEdit(product) {
    setEditing(product)
    setForm({
      sku: product.sku,
      name: product.name,
      category_id: product.category_id ?? '',
      brand_id: product.brand_id ?? '',
      vehicle_brand_id: product.vehicle_brand_id ?? '',
      vehicle_model_id: product.vehicle_model_id ?? '',
      compatible_models: product.compatible_models ?? '',
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      unit: product.unit,
      reorder_level: product.reorder_level,
    })
    setError('')
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    saveMutation.mutate({
      ...form,
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
      vehicle_brand_id: form.vehicle_brand_id || null,
      vehicle_model_id: form.vehicle_model_id || null,
    })
  }

  const products = productsQuery.data?.data ?? []
  const availableVehicleModels = (vehicleModelsQuery.data ?? []).filter(
    (m) => !form.vehicle_brand_id || String(m.vehicle_brand_id) === String(form.vehicle_brand_id)
  )

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Spare parts catalog with live stock levels."
        actions={can('manage_products') && <Button onClick={openCreate}>+ New product</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name, SKU, brand, or vehicle…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      <Card className="overflow-x-auto">
        {productsQuery.isLoading ? (
          <p className="p-6 text-sm text-[var(--muted)]">Loading…</p>
        ) : products.length === 0 ? (
          <EmptyState message="No products found." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Name & Brand</th>
                <th className="px-4 py-3">Vehicle Compatibility</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[var(--ink)]">
                      {p.name}
                      {p.stock_on_hand <= p.reorder_level && (
                        <span className="ml-2 rounded-full bg-[var(--critical-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--critical)]">
                          LOW
                        </span>
                      )}
                    </div>
                    {p.brand && <div className="text-xs text-[var(--muted)]">Brand: {p.brand.name}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {(p.vehicle_brand || p.vehicle_model) ? (
                      <span className="inline-flex items-center gap-1 rounded bg-[var(--accent-soft)] px-2 py-0.5 font-medium text-[var(--accent)]">
                        🚗 {p.vehicle_brand?.name ?? ''} {p.vehicle_model ? `/ ${p.vehicle_model.name}` : ''}
                      </span>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                    {p.compatible_models && (
                      <div className="mt-0.5 text-[11px] text-[var(--muted)] font-mono">{p.compatible_models}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{p.stock_on_hand}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(p.cost_price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(p.selling_price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {can('manage_stock') && (
                      <button
                        onClick={() => setAdjusting(p)}
                        className="mr-3 text-xs font-semibold text-[var(--accent-2)] hover:underline"
                      >
                        Adjust stock
                      </button>
                    )}
                    {can('manage_products') && (
                      <>
                        <button onClick={() => openEdit(p)} className="mr-3 text-xs font-semibold text-[var(--accent-2)] hover:underline">
                          Edit
                        </button>
                        <button
                          onClick={() => window.confirm(`Delete ${p.name}?`) && deleteMutation.mutate(p.id)}
                          className="text-xs font-semibold text-[var(--critical)] hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {formOpen && (
        <Modal title={editing ? 'Edit product' : 'New product'} onClose={closeForm} wide>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <Input label="SKU" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <Input label="Item Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            
            <Select label="Category" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">— Select Category —</option>
              {categoriesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>

            <Select label="Part Brand (Manufacturer)" value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}>
              <option value="">— Select Part Brand —</option>
              {brandsQuery.data?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>

            <Select
              label="Vehicle Brand / Make"
              value={form.vehicle_brand_id}
              onChange={(e) => {
                const newBrandId = e.target.value
                setForm({
                  ...form,
                  vehicle_brand_id: newBrandId,
                  vehicle_model_id: '', // reset selected model when brand changes
                })
              }}
            >
              <option value="">— Select Vehicle Brand —</option>
              {vehicleBrandsQuery.data?.map((vb) => (
                <option key={vb.id} value={vb.id}>{vb.name}</option>
              ))}
            </Select>

            <Select
              label="Vehicle Model"
              value={form.vehicle_model_id}
              onChange={(e) => setForm({ ...form, vehicle_model_id: e.target.value })}
              disabled={!form.vehicle_brand_id && availableVehicleModels.length === 0}
            >
              <option value="">— Select Vehicle Model —</option>
              {availableVehicleModels.map((vm) => (
                <option key={vm.id} value={vm.id}>{vm.name}</option>
              ))}
            </Select>

            <Input
              label="Compatible Models / Notes"
              placeholder="e.g. 2018-2023, KSP130, NZE141"
              className="col-span-2"
              value={form.compatible_models}
              onChange={(e) => setForm({ ...form, compatible_models: e.target.value })}
            />
            
            <Input label="Cost price" type="number" step="0.01" required value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
            <Input label="Selling price" type="number" step="0.01" required value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
            <Input label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <Input label="Reorder level" type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />

            {error && <p className="col-span-2 text-sm text-[var(--critical)]">{error}</p>}

            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={closeForm}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : 'Save product'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {adjusting && (
        <Modal title={`Adjust stock — ${adjusting.name}`} onClose={() => setAdjusting(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              adjustMutation.mutate({ id: adjusting.id, quantity: Number(adjustQty) })
            }}
            className="flex flex-col gap-4"
          >
            <p className="text-sm text-[var(--muted)]">Current stock on hand: {adjusting.stock_on_hand}</p>
            <Input
              label="Quantity change (use a negative number to remove stock)"
              type="number"
              required
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
            />
            {error && <p className="text-sm text-[var(--critical)]">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setAdjusting(null)}>Cancel</Button>
              <Button type="submit" disabled={adjustMutation.isPending}>Apply</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
