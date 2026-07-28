import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, PageHeader } from '../components/ui'

const blankLine = { product_id: '', product_name: '', product_data: null, quantity: 1, unit_price: '', discount: 0 }

/**
 * Customer Auto-suggest Input Component with modern search styling
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
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    ).slice(0, 8)
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

  function handleSelect(customer) {
    setQuery(customer.name)
    onSelectCustomer(customer)
    setIsOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        <span>👤</span> Customer Name
      </label>
      <div className="relative">
        <input
          type="text"
          placeholder="Search existing customer or enter name…"
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && filteredCustomers.length > 0 && (
        <ul className="absolute left-0 right-0 z-30 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-2xl text-xs">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            Existing Customers
          </div>
          {filteredCustomers.map((c) => (
            <li
              key={c.id}
              onClick={() => handleSelect(c)}
              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--accent-soft)] transition"
            >
              <div>
                <span className="font-bold text-sm text-[var(--ink)]">{c.name}</span>
                {c.phone && <span className="ml-2 text-xs text-[var(--muted)]">📞 {c.phone}</span>}
              </div>
              {c.vehicle_no && (
                <span className="rounded-full bg-[var(--paper)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--accent)] border border-[var(--line)]">
                  🚗 {c.vehicle_no}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Product Auto-suggest Combobox Component for Line Items
 */
function ProductSearchInput({ products, line, index, onSelectProduct, onClearProduct }) {
  const [query, setQuery] = useState(line.product_name || '')
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    setQuery(line.product_name || '')
  }, [line.product_name])

  const filteredProducts = useMemo(() => {
    if (!query.trim()) return products.slice(0, 10)
    const q = query.toLowerCase()
    return products.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(q)
      const skuMatch = p.sku.toLowerCase().includes(q)
      const brandMatch = p.brand?.name?.toLowerCase().includes(q)
      const vehicleBrandMatch = p.vehicle_brand?.name?.toLowerCase().includes(q)
      const vehicleModelMatch = p.vehicle_model?.name?.toLowerCase().includes(q)
      const compatibleMatch = p.compatible_models?.toLowerCase().includes(q)
      return nameMatch || skuMatch || brandMatch || vehicleBrandMatch || vehicleModelMatch || compatibleMatch
    }).slice(0, 10)
  }, [products, query])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(product) {
    setQuery(`${product.name} (${product.sku})`)
    onSelectProduct(index, product)
    setIsOpen(false)
  }

  function handleClear() {
    setQuery('')
    onClearProduct(index)
    setIsOpen(true)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Type SKU, part name, or vehicle (e.g. Viva, Oil Filter, Denso)…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 pr-8 text-sm font-medium text-[var(--ink)] placeholder-[var(--muted)] transition focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
        />
        {line.product_id && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted)] hover:text-[var(--critical)]"
            title="Clear product"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <ul className="absolute left-0 right-0 z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-2xl text-xs">
          {filteredProducts.length === 0 ? (
            <li className="p-4 text-center text-xs text-[var(--muted)]">No matching spare parts found.</li>
          ) : (
            filteredProducts.map((p) => (
              <li
                key={p.id}
                onClick={() => handleSelect(p)}
                className="flex cursor-pointer flex-col border-b border-[var(--line)] p-2.5 last:border-0 hover:bg-[var(--accent-soft)] transition rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--ink)]">{p.name}</span>
                  <span className="font-mono font-bold text-sm text-[var(--accent)]">
                    LKR {Number(p.selling_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-md bg-[var(--paper)] px-2 py-0.5 font-mono font-bold border border-[var(--line)] text-[var(--ink)]">
                    {p.sku}
                  </span>
                  {p.brand && (
                    <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 font-medium text-[var(--accent-2)]">
                      {p.brand.name}
                    </span>
                  )}
                  {(p.vehicle_brand || p.vehicle_model) && (
                    <span className="rounded-md bg-blue-500/10 px-2 py-0.5 font-medium text-blue-600 dark:text-blue-400">
                      🚗 {p.vehicle_brand?.name ?? ''} {p.vehicle_model?.name ? `/ ${p.vehicle_model.name}` : ''}
                    </span>
                  )}
                  <span
                    className={`ml-auto rounded-full px-2.5 py-0.5 font-bold ${
                      p.stock_on_hand > 5
                        ? 'bg-[var(--success-soft)] text-[var(--success)]'
                        : p.stock_on_hand > 0
                        ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                        : 'bg-[var(--critical-soft)] text-[var(--critical)]'
                    }`}
                  >
                    Stock: {p.stock_on_hand}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export function InvoiceCreatePage() {
  const navigate = useNavigate()
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [vehicleNo, setVehicleNo] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleYear, setVehicleYear] = useState('')

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
  const balanceDue = Math.max(0, total - (Number(paidAmount) || 0))

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

    createMutation.mutate({
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
        title="New Sales Invoice"
        description="Create a new spare parts invoice with instant product lookup & vehicle details."
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Left Column (Customer & Vehicle Info + Line Items Table) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Card 1: Customer & Vehicle Information */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h2 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
                <span>📋</span> Customer & Vehicle Details
              </h2>
              <span className="text-xs text-[var(--muted)]">Optional for walk-in sales</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomerSearchInput
                customers={customers}
                customerId={customerId}
                customerName={customerName}
                customerPhone={customerPhone}
                onSelectCustomer={handleSelectCustomer}
                onNameChange={(name) => {
                  setCustomerId('')
                  setCustomerName(name)
                }}
              />

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <span>📞</span> Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0771234567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 text-sm font-medium text-[var(--ink)] placeholder-[var(--muted)] transition focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <span>🚗</span> Vehicle Reg. Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. WP CAD-1234"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 font-mono text-sm font-bold uppercase text-[var(--ink)] placeholder-[var(--muted)] transition focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    <span>🚘</span> Vehicle Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Viva / Wira"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 text-sm font-medium text-[var(--ink)] placeholder-[var(--muted)] transition focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    <span>📅</span> Year
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
            </div>
          </Card>

          {/* Card 2: Line Items Section */}
          <Card className="p-6 overflow-visible">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h2 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
                <span>📦</span> Spare Parts & Items
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
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm transition hover:border-[var(--accent-soft)] flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between text-xs text-[var(--muted)] border-b border-[var(--line)] pb-2">
                      <span className="font-bold text-[var(--accent)] uppercase tracking-wider">Item #{index + 1}</span>
                      {product && (
                        <div className="flex items-center gap-3">
                          {product.brand && <span>Brand: <strong className="text-[var(--ink)]">{product.brand.name}</strong></span>}
                          {isOverStock ? (
                            <span className="font-bold text-[var(--critical)] bg-[var(--critical-soft)] px-2 py-0.5 rounded-full">
                              ⚠ Exceeds Stock ({product.stock_on_hand} avail)
                            </span>
                          ) : (
                            <span className="font-medium text-[var(--muted)]">
                              Stock Available: <strong className="text-[var(--ink)]">{product.stock_on_hand}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-6">
                        <ProductSearchInput
                          products={products}
                          line={line}
                          index={index}
                          onSelectProduct={handleSelectProduct}
                          onClearProduct={handleClearProduct}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => updateLine(index, { quantity: e.target.value })}
                          className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-center font-bold text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Price (LKR)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) => updateLine(index, { unit_price: e.target.value })}
                          className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-right font-mono text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>

                      <div className="md:col-span-2 flex items-center justify-between gap-2">
                        <div className="w-full">
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                            Discount
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={line.discount}
                            onChange={(e) => updateLine(index, { discount: e.target.value })}
                            className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-right font-mono text-sm text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="mt-5 rounded-lg p-2 text-xs font-semibold text-[var(--critical)] hover:bg-[var(--critical-soft)] transition"
                          title="Remove item line"
                        >
                          🗑️
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
              <span>➕</span> Add Another Item Line
            </button>
          </Card>
        </div>

        {/* Right Sidebar Column: Billing Summary & Payment Actions */}
        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-6">
          <Card className="p-6 shadow-md border-2 border-[var(--line)]">
            <h2 className="mb-4 text-base font-bold text-[var(--ink)] border-b border-[var(--line)] pb-3 flex items-center gap-2">
              <span>💳</span> Payment & Invoice Summary
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

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Tax / VAT (LKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2 text-right font-mono text-sm font-bold text-[var(--ink)] focus:border-[var(--accent)] focus:outline-none"
                />
              </div>

              <div className="rounded-xl bg-[var(--accent-soft)] p-4 border border-[var(--accent)]/20 my-1">
                <p className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">Grand Total Amount</p>
                <p className="mt-1 font-mono text-2xl font-black text-[var(--accent)]">
                  LKR {Math.max(0, total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Amount Paid Now (LKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 text-right font-mono text-base font-black text-[var(--success)] focus:border-[var(--accent)] focus:outline-none"
                />
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
              disabled={createMutation.isPending}
              className="mt-6 w-full py-3 text-base font-black tracking-wide shadow-lg"
            >
              {createMutation.isPending ? 'Saving Invoice…' : '💾 Create & Complete Invoice'}
            </Button>
          </Card>
        </div>
      </form>
    </div>
  )
}
