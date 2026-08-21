import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MapPin, Store } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, EmptyState, Input, Modal, PageHeader, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const emptyForm = {
  sku: '',
  name: '',
  category_id: '',
  brand_id: '',
  store_id: '',
  vehicle_brand_id: '',
  vehicle_model_id: '',
  compatible_models: '',
  cost_price: '',
  selling_price: '',
  unit: 'pc',
  reorder_level: 5,
}

export function ProductsPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [adjusting, setAdjusting] = useState(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustStoreId, setAdjustStoreId] = useState('')
  const [error, setError] = useState('')

  const storesQuery = useQuery({
    queryKey: ['stores', 'all'],
    queryFn: () => api.get('/stores', { params: { all: true } }).then((r) => r.data),
  })

  const productsQuery = useQuery({
    queryKey: ['products', search, selectedStoreId, lowStockOnly],
    queryFn: () =>
      api
        .get('/products', {
          params: {
            search: search || undefined,
            store_id: selectedStoreId || undefined,
            low_stock: lowStockOnly || undefined,
          },
        })
        .then((r) => r.data),
  })

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then((r) => r.data) })
  const brandsQuery = useQuery({ queryKey: ['brands'], queryFn: () => api.get('/brands').then((r) => r.data) })
  const vehicleBrandsQuery = useQuery({ queryKey: ['vehicle-brands'], queryFn: () => api.get('/vehicle-brands').then((r) => r.data) })
  const vehicleModelsQuery = useQuery({ queryKey: ['vehicle-models'], queryFn: () => api.get('/vehicle-models').then((r) => r.data) })

  const stores = storesQuery.data?.data ?? []

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
    mutationFn: ({ id, quantity, store_id }) => api.post(`/products/${id}/adjust-stock`, { quantity, store_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setAdjusting(null)
      setAdjustQty('')
      setAdjustStoreId('')
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
      store_id: product.store_id ?? '',
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

  function openAdjust(product) {
    setAdjusting(product)
    setAdjustQty('')
    setAdjustStoreId(product.store_id ? String(product.store_id) : '')
    setError('')
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
      store_id: form.store_id || null,
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
        description="Spare parts catalog linked with store locations and live stock levels."
        actions={can('manage_products') && <Button onClick={openCreate}>+ New product</Button>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="w-64 sm:w-80">
          <Input
            placeholder="Search by name, SKU, brand, or vehicle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-48 sm:w-60">
          <Select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
          >
            <option value="">All Store Locations</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code}) - {s.location}
              </option>
            ))}
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded border-[var(--line)] text-[var(--accent)] focus:ring-0"
          />
          <span>Low stock only</span>
        </label>
      </div>

      <Card className="overflow-x-auto shadow-xs">
        {productsQuery.isLoading ? (
          <p className="p-8 text-center text-sm text-[var(--muted)]">Loading products…</p>
        ) : products.length === 0 ? (
          <EmptyState message="No products found." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--muted)] bg-[var(--paper)]/50">
                <th className="px-4 py-3 whitespace-nowrap">SKU</th>
                <th className="px-4 py-3 whitespace-nowrap">Name & Brand</th>
                <th className="px-4 py-3 whitespace-nowrap">Store Location</th>
                <th className="px-4 py-3 whitespace-nowrap">Vehicle Compatibility</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Stock</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Cost</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Price</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)]/40 transition">
                  <td className="px-4 py-3.5 font-mono text-xs font-semibold whitespace-nowrap text-[var(--ink)]">{p.sku}</td>
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-[var(--ink)] leading-snug">
                      {p.name}
                      {p.stock_on_hand <= p.reorder_level && (
                        <span className="ml-2 rounded-full bg-[var(--critical-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--critical)] uppercase tracking-wider">
                          LOW
                        </span>
                      )}
                    </div>
                    {p.brand && <div className="text-xs text-[var(--muted)] mt-0.5">Brand: {p.brand.name}</div>}
                  </td>
                  <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                    {p.store ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-soft)] border border-[var(--line)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--accent)] whitespace-nowrap shadow-2xs"
                        title={`${p.store.name} (${p.store.location})`}
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                        <span>{p.store.code}</span>
                      </span>
                    ) : (
                      <span className="text-[var(--muted)] text-xs italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs">
                    {(p.vehicle_brand || p.vehicle_model) ? (
                      <span className="inline-flex items-center gap-1 rounded bg-[var(--accent-soft)] px-2 py-0.5 font-semibold text-[var(--accent)] whitespace-nowrap">
                        🚗 {p.vehicle_brand?.name ?? ''} {p.vehicle_model ? `/ ${p.vehicle_model.name}` : ''}
                      </span>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                    {p.compatible_models && (
                      <div className="mt-0.5 text-[11px] text-[var(--muted)] font-mono line-clamp-1">{p.compatible_models}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-bold text-sm">{p.stock_on_hand}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-xs">{Number(p.cost_price).toFixed(2)}</td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-xs text-[var(--ink)]">{Number(p.selling_price).toFixed(2)}</td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-3 text-xs font-semibold">
                      {can('manage_stock') && (
                        <button
                          onClick={() => openAdjust(p)}
                          className="text-[var(--accent-2)] hover:underline"
                        >
                          Adjust stock
                        </button>
                      )}
                      {can('manage_products') && (
                        <>
                          <button onClick={() => openEdit(p)} className="text-[var(--accent-2)] hover:underline">
                            Edit
                          </button>
                          <button
                            onClick={() => window.confirm(`Delete ${p.name}?`) && deleteMutation.mutate(p.id)}
                            className="text-[var(--critical)] hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
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
              label="Store Location"
              value={form.store_id}
              onChange={(e) => setForm({ ...form, store_id: e.target.value })}
              className="col-span-1 sm:col-span-2"
            >
              <option value="">— Primary Store Location (Optional) —</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) - {s.location}
                </option>
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
                  vehicle_model_id: '',
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
              className="col-span-1 sm:col-span-2"
              value={form.compatible_models}
              onChange={(e) => setForm({ ...form, compatible_models: e.target.value })}
            />
            
            <Input label="Cost price" type="number" step="0.01" required value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} />
            <Input label="Selling price" type="number" step="0.01" required value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} />
            <Input label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <Input label="Reorder level" type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} />

            {error && <p className="col-span-1 sm:col-span-2 text-sm text-[var(--critical)]">{error}</p>}

            <div className="col-span-1 sm:col-span-2 flex justify-end gap-2 pt-2">
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
              adjustMutation.mutate({
                id: adjusting.id,
                quantity: Number(adjustQty),
                store_id: adjustStoreId ? Number(adjustStoreId) : null,
              })
            }}
            className="flex flex-col gap-4"
          >
            <p className="text-sm text-[var(--muted)]">Current stock on hand: {adjusting.stock_on_hand}</p>
            
            <Select
              label="Store Location for Adjustment"
              value={adjustStoreId}
              onChange={(e) => setAdjustStoreId(e.target.value)}
            >
              <option value="">— Use Product's Store Location —</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) - {s.location}
                </option>
              ))}
            </Select>

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
