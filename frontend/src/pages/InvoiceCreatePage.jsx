import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  User,
  Phone,
  Car,
  Calendar,
  Package,
  CreditCard,
  Plus,
  Trash2,
  Search,
  FileText,
  X,
  Save,
  AlertTriangle,
} from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, PageHeader } from '../components/ui'

const blankLine = { product_id: '', product_name: '', product_data: null, quantity: 1, unit_price: '', discount: 0 }

/**
 * Customer Auto-suggest Input Component with clean Lucide icons
 */
function CustomerSearchInput({ customers, customerName, onSelectCustomer, onNameChange }) {
  const [query, setQuery] = useState(customerName || '')
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    setQuery(customerName || '')
  }, [customerName])

  const filteredCustomers = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)))
      .slice(0, 8)
  }, [customers, query])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleInputChange(e) {
    const val = e.target.value
    setQuery(val)
    onNameChange(val)
    setIsOpen(true)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        <User className="h-3.5 w-3.5 text-[var(--accent)]" />
        <span>Customer Name</span>
      </label>

      <div className="relative flex items-center">
        <input
          type="text"
          placeholder="Search customer name or phone…"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 text-sm font-medium text-[var(--ink)] placeholder-[var(--muted)] transition focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              onNameChange('')
            }}
            className="absolute right-3 text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && filteredCustomers.length > 0 && (
        <ul className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-xl">
          {filteredCustomers.map((customer) => (
            <li
              key={customer.id}
              onClick={() => {
                onSelectCustomer(customer)
                setIsOpen(false)
              }}
              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
            >
              <span className="font-semibold text-[var(--ink)]">{customer.name}</span>
              {customer.phone && <span className="font-mono text-xs text-[var(--muted)]">{customer.phone}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Product Auto-suggest Input Component with SKU search
 */
function ProductSearchInput({ products, line, index, onSelectProduct, onClearProduct }) {
  const [query, setQuery] = useState(line.product_name || '')
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    setQuery(line.product_name || '')
  }, [line.product_name])

  const filteredProducts = useMemo(() => {
    if (!query.trim() || line.product_id) return []
    const q = query.toLowerCase()
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.vehicle_model && p.vehicle_model.name.toLowerCase().includes(q))
      )
      .slice(0, 10)
  }, [products, query, line.product_id])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Select Product / Part SKU
      </label>

      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3 text-[var(--muted)]">
          <Search className="h-4 w-4" />
        </div>

        <input
          type="text"
          placeholder="Type SKU, part name, or vehicle model…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (line.product_id) onClearProduct(index)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] pl-9 pr-8 py-2.5 text-sm font-semibold text-[var(--ink)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none"
        />

        {line.product_id && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              onClearProduct(index)
            }}
            className="absolute right-2.5 rounded-md p-1 text-[var(--muted)] hover:bg-[var(--line)] hover:text-[var(--ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && !line.product_id && filteredProducts.length > 0 && (
        <ul className="absolute left-0 right-0 z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-2xl">
          {filteredProducts.map((product) => (
            <li
              key={product.id}
              onClick={() => {
                onSelectProduct(index, product)
                setIsOpen(false)
              }}
              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition hover:bg-[var(--accent-soft)]"
            >
              <div className="flex flex-col">
                <span className="font-bold text-[var(--ink)]">{product.name}</span>
                <span className="text-xs text-[var(--muted)]">
                  SKU: <strong className="font-mono text-[var(--ink)]">{product.sku}</strong>
                  {product.brand && ` • Brand: ${product.brand.name}`}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-mono font-bold text-[var(--accent)]">
                  LKR {Number(product.selling_price).toFixed(2)}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    product.stock_on_hand > 0
                      ? 'bg-[var(--success-soft)] text-[var(--success)]'
                      : 'bg-[var(--critical-soft)] text-[var(--critical)]'
                  }`}
                >
                  {product.stock_on_hand > 0 ? `${product.stock_on_hand} in stock` : 'Out of Stock'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function InvoiceCreatePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [vehicleNo, setVehicleNo] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleYear, setVehicleYear] = useState('')

  const [lines, setLines] = useState([{ ...blankLine }])
  const [discount, setDiscount] = useState('0')
  const [tax, setTax] = useState('0')
  const [applyTax, setApplyTax] = useState(false)
  const [taxRate, setTaxRate] = useState('0')
  const [paidAmount, setPaidAmount] = useState('0')
  const [isFullyPaid, setIsFullyPaid] = useState(false)
  const [error, setError] = useState('')

  const customersQuery = useQuery({ queryKey: ['customers', 'all'], queryFn: () => api.get('/customers').then((r) => r.data) })
  const productsQuery = useQuery({ queryKey: ['products', 'all'], queryFn: () => api.get('/products', { params: { search: '' } }).then((r) => r.data) })
  const vehicleModelsQuery = useQuery({ queryKey: ['vehicle-models'], queryFn: () => api.get('/vehicle-models').then((r) => r.data) })
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings').then((r) => r.data) })

  const existingInvoiceQuery = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => api.get(`/invoices/${id}`).then((r) => r.data),
    enabled: isEdit,
  })

  const products = productsQuery.data?.data ?? []
  const customers = customersQuery.data?.data ?? []
  const vehicleModels = vehicleModelsQuery.data ?? []

  useEffect(() => {
    if (settingsQuery.data?.tax_rate !== undefined && settingsQuery.data?.tax_rate !== null) {
      setTaxRate(String(settingsQuery.data.tax_rate))
    }
  }, [settingsQuery.data])

  useEffect(() => {
    if (isEdit && existingInvoiceQuery.data) {
      const inv = existingInvoiceQuery.data
      setCustomerId(inv.customer_id ? String(inv.customer_id) : '')
      setCustomerName(inv.customer_name || inv.customer?.name || '')
      setCustomerPhone(inv.customer_phone || inv.customer?.phone || '')
      setVehicleNo(inv.vehicle_no || '')
      setVehicleModel(inv.vehicle_model || '')
      setVehicleYear(inv.vehicle_year || '')
      setDiscount(String(inv.discount || '0'))
      setTax(String(inv.tax || '0'))
      setApplyTax(Number(inv.tax) > 0)

      // Set tax rate from Settings
      if (settingsQuery.data?.tax_rate !== undefined && settingsQuery.data?.tax_rate !== null) {
        setTaxRate(String(settingsQuery.data.tax_rate))
      }

      setPaidAmount(String(inv.paid_amount || '0'))
      setIsFullyPaid(Number(inv.due_amount) <= 0)

      if (inv.items && inv.items.length > 0) {
        setLines(
          inv.items.map((item) => ({
            product_id: item.product_id,
            product_name: `${item.product?.name || ''} (${item.product?.sku || ''})`,
            product_data: item.product,
            quantity: item.quantity,
            unit_price: String(item.unit_price),
            discount: item.discount || 0,
          }))
        )
      }
    }
  }, [isEdit, existingInvoiceQuery.data, settingsQuery.data])

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0) - (Number(l.discount) || 0), 0),
    [lines]
  )

  useEffect(() => {
    if (applyTax) {
      const netAmount = Math.max(0, subtotal - (Number(discount) || 0))
      const calcTax = (netAmount * (Number(taxRate) || 0)) / 100
      setTax(calcTax.toFixed(2))
    } else {
      setTax('0')
    }
  }, [applyTax, taxRate, subtotal, discount])

  const total = subtotal - (Number(discount) || 0) + (Number(tax) || 0)

  useEffect(() => {
    if (isFullyPaid) {
      setPaidAmount(Math.max(0, total).toFixed(2))
    }
  }, [isFullyPaid, total])
  const balanceDue = Math.max(0, total - (Number(paidAmount) || 0))

  const saveMutation = useMutation({
    mutationFn: (payload) => (isEdit ? api.put(`/invoices/${id}`, payload) : api.post('/invoices', payload)),
    onSuccess: ({ data }) => navigate(`/invoices/${data.id}`),
    onError: (err) => setError(apiErrorMessage(err, `Could not ${isEdit ? 'update' : 'create'} the invoice.`)),
  })

  function updateLine(index, patch) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function addLine() {
    setLines((prev) => [...prev, { ...blankLine }])
  }

  function removeLine(index) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ ...blankLine }]))
  }

  function handleSelectCustomer(customer) {
    setCustomerId(customer.id)
    setCustomerName(customer.name)
    setCustomerPhone(customer.phone || '')
    if (customer.vehicle_no) setVehicleNo(customer.vehicle_no)
  }

  function handleSelectProduct(index, product) {
    updateLine(index, {
      product_id: product.id,
      product_name: `${product.name} (${product.sku})`,
      product_data: product,
      unit_price: product.selling_price,
    })
  }

  function handleClearProduct(index) {
    updateLine(index, {
      product_id: '',
      product_name: '',
      product_data: null,
      unit_price: '',
    })
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
      setError('Please select at least one valid product line item.')
      return
    }

    saveMutation.mutate({
      customer_id: customerId || null,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      vehicle_no: vehicleNo || null,
      vehicle_model: vehicleModel || null,
      vehicle_year: vehicleYear || null,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      paid_amount: Number(paidAmount) || 0,
      items,
    })
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <PageHeader
        title={isEdit ? `Edit Invoice #${existingInvoiceQuery.data?.invoice_no || ''}` : 'New Sales Invoice'}
        description={
          isEdit
            ? 'Update customer details, vehicle information, or item quantities for this invoice.'
            : 'Create a new spare parts invoice with instant product lookup & vehicle details.'
        }
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Left Column (Customer & Vehicle Info + Line Items Table) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Card 1: Customer & Vehicle Information */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h2 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--accent)]" />
                <span>Customer & Vehicle Details</span>
              </h2>
              <span className="text-xs text-[var(--muted)]">Optional for walk-in sales</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <CustomerSearchInput
                  customers={customers}
                  customerName={customerName}
                  onSelectCustomer={handleSelectCustomer}
                  onNameChange={(name) => {
                    setCustomerId('')
                    setCustomerName(name)
                  }}
                />
              </div>

              <div className="md:col-span-6">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <Phone className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0771234567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 text-sm font-medium text-[var(--ink)] placeholder-[var(--muted)] transition focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
              </div>

              <div className="md:col-span-4">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <Car className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>Vehicle Reg. Number</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. WP CAD-1234"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 font-mono text-sm font-bold uppercase text-[var(--ink)] placeholder-[var(--muted)] transition focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
              </div>

              <div className="md:col-span-5">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <Car className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>Vehicle Model</span>
                </label>
                <select
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 text-sm font-medium text-[var(--ink)] transition focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
                >
                  <option value="">Select Vehicle Model…</option>
                  {vehicleModels.map((m) => {
                    const label = m.vehicle_brand ? `${m.vehicle_brand.name} — ${m.name}` : m.name
                    return (
                      <option key={m.id} value={m.name}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <Calendar className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>Year</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2018"
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 text-sm font-medium text-[var(--ink)] placeholder-[var(--muted)] transition focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
              </div>
            </div>
          </Card>

          {/* Card 2: Line Items Section */}
          <Card className="p-6 overflow-visible">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h2 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
                <Package className="h-5 w-5 text-[var(--accent)]" />
                <span>Spare Parts & Items</span>
              </h2>
              <span className="text-xs text-[var(--muted)]">Stock automatically updates upon save</span>
            </div>

            <div className="flex flex-col gap-4">
              {lines.map((line, index) => {
                const product = line.product_data || products.find((p) => String(p.id) === String(line.product_id))
                const isOverStock = product && Number(line.quantity) > product.stock_on_hand
                const lineSubtotal = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0) - (Number(line.discount) || 0)

                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-xs transition hover:border-[var(--accent-soft)] flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between text-xs text-[var(--muted)] border-b border-[var(--line)] pb-2">
                      <span className="font-bold text-[var(--accent)] uppercase tracking-wider">Item #{index + 1}</span>
                      {product && (
                        <div className="flex items-center gap-3">
                          {product.brand && <span>Brand: <strong className="text-[var(--ink)]">{product.brand.name}</strong></span>}
                          {isOverStock ? (
                            <span className="flex items-center gap-1 font-bold text-[var(--critical)] bg-[var(--critical-soft)] px-2.5 py-0.5 rounded-full">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Exceeds Stock ({product.stock_on_hand} avail)</span>
                            </span>
                          ) : (
                            <span className="font-medium text-[var(--muted)]">
                              Stock Available: <strong className="text-[var(--ink)]">{product.stock_on_hand}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-12 gap-3 items-end">
                      <div className="col-span-3 md:col-span-5">
                        <ProductSearchInput
                          products={products}
                          line={line}
                          index={index}
                          onSelectProduct={handleSelectProduct}
                          onClearProduct={handleClearProduct}
                        />
                      </div>

                      <div className="col-span-1 md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => updateLine(index, { quantity: e.target.value })}
                          className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2.5 text-center font-bold text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>

                      <div className="col-span-1 md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Price (LKR)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={line.unit_price}
                          onChange={(e) => updateLine(index, { unit_price: e.target.value })}
                          className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2.5 text-right font-mono text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>

                      <div className="col-span-1 md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Discount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={line.discount}
                          onChange={(e) => updateLine(index, { discount: e.target.value })}
                          className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-2.5 py-2.5 text-right font-mono text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>

                      <div className="col-span-3 md:col-span-1 flex justify-end pb-1">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="rounded-lg p-2.5 text-xs font-semibold text-[var(--critical)] hover:bg-[var(--critical-soft)] transition"
                          title="Remove item line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--line)] text-xs">
                      <span className="text-[var(--muted)] font-medium">Line Total:</span>
                      <span className="font-mono font-bold text-sm text-[var(--ink)]">
                        LKR {Math.max(0, lineSubtotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              onClick={addLine}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper)] p-3 text-sm font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)] transition"
            >
              <Plus className="h-4 w-4" />
              <span>Add Another Item Line</span>
            </button>
          </Card>
        </div>

        {/* Right Sidebar Column: Billing Summary & Payment Actions */}
        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-6">
          <Card className="p-6 shadow-md border-2 border-[var(--line)]">
            <h2 className="mb-4 text-base font-bold text-[var(--ink)] border-b border-[var(--line)] pb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[var(--accent)]" />
              <span>Payment & Invoice Summary</span>
            </h2>

            <div className="flex flex-col gap-4 text-sm">
              <div className="flex items-center justify-between text-[var(--muted)]">
                <span>Subtotal ({lines.filter((l) => l.product_id).length} items)</span>
                <span className="font-mono font-bold text-[var(--ink)]">
                  LKR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Invoice Overall Discount (LKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2 text-right font-mono text-sm font-bold text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 shadow-xs">
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={applyTax}
                      onChange={(e) => setApplyTax(e.target.checked)}
                      className="h-4 w-4 rounded border-[var(--line)] text-[var(--accent)] focus:ring-[var(--accent)] accent-[var(--accent)] cursor-pointer"
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
                      Apply Tax / VAT
                    </span>
                  </div>
                  {applyTax && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-[var(--muted)]">Rate:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        className="w-14 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-right font-mono text-xs font-bold text-[var(--ink)] focus:border-[var(--accent)] outline-none"
                      />
                      <span className="text-xs font-bold text-[var(--muted)]">%</span>
                    </div>
                  )}
                </label>

                {applyTax && (
                  <div className="mt-2 flex items-center justify-between pt-2 border-t border-[var(--line)] text-xs">
                    <span className="text-[var(--muted)] font-medium">Tax Amount ({taxRate}%):</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-[var(--accent)]">LKR</span>
                      <input
                        type="number"
                        step="0.01"
                        value={tax}
                        onChange={(e) => setTax(e.target.value)}
                        className="w-28 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-right font-mono text-xs font-bold text-[var(--ink)] focus:border-[var(--accent)] outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-[var(--accent-soft)] p-4 border border-[var(--accent)]/20 my-1">
                <p className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">Grand Total Amount</p>
                <p className="mt-1 font-mono text-2xl font-black text-[var(--accent)]">
                  LKR {Math.max(0, total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3.5 shadow-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none mb-2 border-b border-[var(--line)] pb-2">
                  <input
                    type="checkbox"
                    checked={isFullyPaid}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setIsFullyPaid(checked)
                      if (checked) {
                        setPaidAmount(Math.max(0, total).toFixed(2))
                      }
                    }}
                    className="h-4 w-4 rounded border-[var(--line)] text-[var(--success)] focus:ring-[var(--success)] accent-[var(--success)] cursor-pointer"
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">
                    Mark as Fully Paid
                  </span>
                </label>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Amount Paid Now (LKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => {
                      setPaidAmount(e.target.value)
                      if (Number(e.target.value) !== total) {
                        setIsFullyPaid(false)
                      }
                    }}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-right font-mono text-base font-black text-[var(--success)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-[var(--paper)] p-3 border border-[var(--line)]">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">Balance Due</p>
                  <p className="font-mono text-lg font-bold text-[var(--critical)]">
                    LKR {balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    balanceDue <= 0
                      ? 'bg-[var(--success-soft)] text-[var(--success)]'
                      : Number(paidAmount) > 0
                      ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                      : 'bg-[var(--critical-soft)] text-[var(--critical)]'
                  }`}
                >
                  {balanceDue <= 0 ? 'PAID' : Number(paidAmount) > 0 ? 'PARTIAL' : 'DUE'}
                </span>
              </div>
            </div>

            {error && <p className="mt-4 text-xs font-bold text-[var(--critical)] bg-[var(--critical-soft)] p-3 rounded-lg">{error}</p>}

            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="mt-6 w-full py-3 text-base font-black tracking-wide shadow-lg flex items-center justify-center gap-2"
            >
              <Save className="h-5 w-5" />
              <span>
                {saveMutation.isPending
                  ? 'Saving Invoice…'
                  : isEdit
                  ? 'Update Invoice'
                  : 'Create & Complete Invoice'}
              </span>
            </Button>
          </Card>
        </div>
      </form>
    </div>
  )
}
