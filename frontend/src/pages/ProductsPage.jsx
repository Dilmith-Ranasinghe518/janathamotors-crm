import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MapPin,
  Store,
  Download,
  Upload,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  QrCode,
} from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, EmptyState, Input, Modal, PageHeader, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { ProductQrModal, ProductQrThumb, printQrSheet } from '../components/ProductQr'

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

const emptyForm = {
  part_no: '',
  item_code: '',
  name: '',
  category_id: '',
  brand_id: '',
  store_id: '',
  shelf_location: '',
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
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [adjusting, setAdjusting] = useState(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustStoreId, setAdjustStoreId] = useState('')
  const [error, setError] = useState('')
  const [qrProduct, setQrProduct] = useState(null)

  // Import & Export states
  const [isExporting, setIsExporting] = useState(false)
  const [isPrintingQr, setIsPrintingQr] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [updateExisting, setUpdateExisting] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)

  const storesQuery = useQuery({
    queryKey: ['stores', 'all'],
    queryFn: () => api.get('/stores', { params: { all: true } }).then((r) => r.data),
  })

  const productsQuery = useQuery({
    queryKey: ['products', search, selectedStoreId, selectedCategoryId, lowStockOnly],
    queryFn: () =>
      api
        .get('/products', {
          params: {
            search: search || undefined,
            store_id: selectedStoreId || undefined,
            category_id: selectedCategoryId || undefined,
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
      part_no: product.part_no ?? '',
      item_code: product.item_code ?? '',
      name: product.name,
      category_id: product.category_id ?? '',
      brand_id: product.brand_id ?? '',
      store_id: product.store_id ?? '',
      shelf_location: product.shelf_location ?? '',
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

  // Prints QR labels for every product matching the current filters, across all result pages.
  async function handlePrintQrSheet() {
    const win = window.open('', '_blank')
    if (!win) {
      alert('Please allow pop-ups for this site to print the QR sheet.')
      return
    }
    win.document.write('<p style="font-family:sans-serif;padding:24px">Preparing QR labels…</p>')
    try {
      setIsPrintingQr(true)
      const all = []
      let page = 1
      let lastPage = 1
      do {
        const { data } = await api.get('/products', {
          params: {
            page,
            per_page: 1000,
            search: search || undefined,
            store_id: selectedStoreId || undefined,
            category_id: selectedCategoryId || undefined,
            low_stock: lowStockOnly || undefined,
          },
        })
        all.push(...data.data)
        lastPage = data.last_page
        page++
      } while (page <= lastPage)

      if (all.length === 0) {
        win.close()
        alert('No products match the current filters.')
        return
      }
      printQrSheet(all, win)
    } catch (err) {
      win.close()
      alert(apiErrorMessage(err, 'Could not load products for the QR sheet.'))
    } finally {
      setIsPrintingQr(false)
    }
  }

  async function handleExport() {
    try {
      setIsExporting(true)
      const response = await api.get('/products/export', {
        params: {
          search: search || undefined,
          store_id: selectedStoreId || undefined,
          low_stock: lowStockOnly || undefined,
        },
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to export inventory.'))
    } finally {
      setIsExporting(false)
    }
  }

  async function handleDownloadTemplate() {
    try {
      setIsDownloadingTemplate(true)
      const response = await api.get('/products/template', { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'inventory_template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setImportError(apiErrorMessage(err, 'Failed to download template.'))
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  async function handleImportSubmit(e) {
    e.preventDefault()
    if (!importFile) {
      setImportError('Please select a CSV file to upload.')
      return
    }
    setImportError('')
    setIsImporting(true)

    const formData = new FormData()
    formData.append('file', importFile)
    formData.append('update_existing', updateExisting ? '1' : '0')

    try {
      const res = await api.post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportResult(res.data)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-brands'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-models'] })
    } catch (err) {
      setImportError(apiErrorMessage(err, 'Failed to import inventory file.'))
    } finally {
      setIsImporting(false)
    }
  }

  function closeImportModal() {
    setImportModalOpen(false)
    setImportFile(null)
    setImportError('')
    setImportResult(null)
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
        actions={
          can('manage_products') && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={handlePrintQrSheet}
                disabled={isPrintingQr}
                className="flex items-center gap-1.5"
                title="Print QR labels for all listed products (63 per A4 page)"
              >
                <QrCode className="h-4 w-4" />
                <span>{isPrintingQr ? 'Preparing…' : 'QR Sheet'}</span>
              </Button>

              <Button
                variant="secondary"
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-1.5"
                title="Export inventory to CSV"
              >
                <Download className="h-4 w-4" />
                <span>{isExporting ? 'Exporting…' : 'Export'}</span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  setImportModalOpen(true)
                  setImportResult(null)
                  setImportFile(null)
                  setImportError('')
                }}
                className="flex items-center gap-1.5"
                title="Bulk import products from CSV"
              >
                <Upload className="h-4 w-4" />
                <span>Import</span>
              </Button>

              <Button onClick={openCreate} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                <span>New product</span>
              </Button>
            </div>
          )
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="w-64 sm:w-80">
          <Input
            placeholder="Search by name, item no, part no, item code, brand, or vehicle…"
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

        <div className="w-48 sm:w-60">
          <Select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
          >
            <option value="">All Categories</option>
            {categoriesQuery.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
                <th className="px-4 py-3 whitespace-nowrap">Item No</th>
                <th className="px-4 py-3 whitespace-nowrap">Item Code</th>
                <th className="px-4 py-3 whitespace-nowrap">Part No</th>
                <th className="px-4 py-3 whitespace-nowrap">QR</th>
                <th className="px-4 py-3 whitespace-nowrap">Name & Brand</th>
                <th className="px-4 py-3 whitespace-nowrap">Store Location</th>
                <th className="px-4 py-3 whitespace-nowrap">Vehicle Compatibility</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Stock</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Cost</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Price</th>
                <th className="px-4 py-3 whitespace-nowrap">Added</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)]/40 transition">
                  <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap text-[var(--muted)]">{p.item_no}</td>
                  <td className="px-4 py-3.5 font-mono text-xs font-semibold whitespace-nowrap text-[var(--ink)]">{p.item_code || '—'}</td>
                  <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap text-[var(--ink)]">{p.part_no || <span className="text-[var(--muted)]">—</span>}</td>
                  <td className="px-4 py-3.5">
                    <ProductQrThumb product={p} onClick={() => setQrProduct(p)} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-[var(--ink)] leading-snug">
                      {p.name}
                      {p.stock_on_hand <= p.reorder_level && (
                        <span className="ml-2 rounded-full bg-[var(--critical-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--critical)] uppercase tracking-wider">
                          LOW
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-[var(--muted)]">
                      {p.category && (
                        <span className="rounded bg-[var(--paper)] px-1.5 py-0.2 text-[11px] font-medium text-[var(--ink)] border border-[var(--line)]">
                          {p.category.name}
                        </span>
                      )}
                      {p.brand && <span>Brand: {p.brand.name}</span>}
                    </div>
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
                    {p.shelf_location && (
                      <div className="mt-1 text-[11px] font-medium text-[var(--muted)]">{p.shelf_location}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs">
                    {(p.vehicle_brand || p.vehicle_model) ? (
                      <span className="inline-flex items-center gap-1 rounded bg-[var(--accent-soft)] px-2 py-0.5 font-semibold text-[var(--accent)] whitespace-nowrap">
                        {p.vehicle_brand?.name ?? ''} {p.vehicle_model ? `/ ${p.vehicle_model.name}` : ''}
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
                  <td className="px-4 py-3.5 text-xs whitespace-nowrap text-[var(--muted)]">{formatDate(p.created_at)}</td>
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
            <Input label="Item Code" placeholder="Your code for this item" value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} />
            <Input label="Item Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Part No" placeholder="Manufacturer / OEM part number" value={form.part_no} onChange={(e) => setForm({ ...form, part_no: e.target.value })} />
            <Input
              label="Item No (system)"
              value={editing ? `${editing.item_no} · added ${formatDate(editing.created_at)}` : 'Auto-generated on save'}
              disabled
              className="opacity-70"
            />
            
            <Select
              label={
                <span className="flex items-center justify-between">
                  <span>Category</span>
                  <Link to="/brands" target="_blank" className="text-xs font-normal text-[var(--accent-2)] hover:underline">
                    Manage ↗
                  </Link>
                </span>
              }
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="">— Select Category —</option>
              {categoriesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>

            <Select
              label={
                <span className="flex items-center justify-between">
                  <span>Part Brand (Manufacturer)</span>
                  <Link to="/brands" target="_blank" className="text-xs font-normal text-[var(--accent-2)] hover:underline">
                    Manage ↗
                  </Link>
                </span>
              }
              value={form.brand_id}
              onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
            >
              <option value="">— Select Part Brand —</option>
              {brandsQuery.data?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>

            <Select
              label="Store Location"
              value={form.store_id}
              onChange={(e) => setForm({ ...form, store_id: e.target.value })}
            >
              <option value="">— Primary Store Location (Optional) —</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) - {s.location}
                </option>
              ))}
            </Select>

            <Input
              label="Rack / Shelf Location"
              placeholder="e.g. Rack A3, Bin 12"
              value={form.shelf_location}
              onChange={(e) => setForm({ ...form, shelf_location: e.target.value })}
            />

            <Select
              label={
                <span className="flex items-center justify-between">
                  <span>Vehicle Brand / Make</span>
                  <Link to="/brands" target="_blank" className="text-xs font-normal text-[var(--accent-2)] hover:underline">
                    Manage ↗
                  </Link>
                </span>
              }
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
              className="col-span-2"
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

      {qrProduct && <ProductQrModal product={qrProduct} onClose={() => setQrProduct(null)} />}

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

      {importModalOpen && (
        <Modal
          title={importResult ? 'Import Results' : 'Import Inventory (CSV)'}
          onClose={closeImportModal}
          wide={!!importResult}
        >
          {!importResult ? (
            <form onSubmit={handleImportSubmit} className="flex flex-col gap-4">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3.5 text-xs text-[var(--muted)] flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--ink)] mb-0.5">Need the right format?</p>
                  <p>Download our sample template with pre-filled columns and instructions.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  className="shrink-0 flex items-center gap-1 font-bold text-[var(--accent)] hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{isDownloadingTemplate ? 'Downloading…' : 'Template'}</span>
                </button>
              </div>

              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">CSV File</label>
                <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--line)] bg-[var(--paper)]/50 p-6 text-center hover:bg-[var(--paper)] transition">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setImportFile(file)
                        setImportError('')
                      }
                    }}
                  />
                  {importFile ? (
                    <div className="flex flex-col items-center gap-1">
                      <FileSpreadsheet className="h-8 w-8 text-[var(--accent)]" />
                      <p className="text-sm font-bold text-[var(--ink)]">{importFile.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {(importFile.size / 1024).toFixed(1)} KB — Click or drop another to replace
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload className="h-7 w-7 text-[var(--muted)]" />
                      <p className="text-sm font-semibold text-[var(--ink)]">Click to choose or drag & drop CSV file</p>
                      <p className="text-xs text-[var(--muted)]">Max file size: 10 MB (.csv)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Update existing checkbox */}
              <label className="flex items-center gap-2.5 text-xs font-medium text-[var(--ink)] select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="rounded border-[var(--line)]"
                />
                <span>Update product details if Item Code already exists</span>
              </label>

              {importError && (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--critical-soft)] p-3 text-xs text-[var(--critical)]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
                <Button type="button" variant="secondary" onClick={closeImportModal} disabled={isImporting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!importFile || isImporting}>
                  {isImporting ? 'Importing…' : 'Upload & Import'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-xl bg-[var(--success-soft)] p-4 text-[var(--success)]">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <div>
                  <p className="text-sm font-bold">Import Completed</p>
                  <p className="text-xs">{importResult.message}</p>
                </div>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3">
                  <p className="text-xl font-extrabold text-[var(--success)]">{importResult.created ?? 0}</p>
                  <p className="text-xs text-[var(--muted)]">Created</p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3">
                  <p className="text-xl font-extrabold text-[var(--accent)]">{importResult.updated ?? 0}</p>
                  <p className="text-xs text-[var(--muted)]">Updated</p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3">
                  <p className="text-xl font-extrabold text-[var(--muted)]">{importResult.skipped ?? 0}</p>
                  <p className="text-xs text-[var(--muted)]">Skipped</p>
                </div>
              </div>

              {/* Error messages if any */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="rounded-xl border border-[var(--critical-soft)] bg-[var(--critical-soft)]/40 p-3.5">
                  <p className="text-xs font-bold text-[var(--critical)] mb-1.5 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    Warnings & Skipped Rows ({importResult.errors.length})
                  </p>
                  <ul className="max-h-40 overflow-y-auto space-y-1 text-xs text-[var(--critical)] pr-1">
                    {importResult.errors.map((err, i) => (
                      <li key={i} className="list-disc list-inside">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setImportResult(null)
                    setImportFile(null)
                  }}
                >
                  Import another
                </Button>
                <Button type="button" onClick={closeImportModal}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
