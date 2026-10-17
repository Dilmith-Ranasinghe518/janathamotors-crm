import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  CreditCard,
  Download,
  MessageCircle,
  Package,
  Printer,
  Receipt,
  Truck,
  Users,
} from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Card, EmptyState, Input, PageHeader, Select } from '../components/ui'

const REPORT_GROUPS = [
  {
    label: 'Sales',
    reports: [
      { key: 'sales', label: 'Sales Summary', description: 'Daily invoices, sales, collections and dues', icon: Receipt },
      { key: 'product_sales', label: 'Product Sales', description: 'Quantity, revenue and gross profit per item', icon: Package },
      { key: 'payments', label: 'Payments Collected', description: 'Payments received by day and method', icon: CreditCard },
      { key: 'whatsapp_orders', label: 'WhatsApp Orders', description: 'Orders by shipping partner and status', icon: MessageCircle },
    ],
  },
  {
    label: 'Inventory',
    reports: [
      { key: 'stock_valuation', label: 'Stock Valuation', description: 'Stock on hand at cost and retail value', icon: Boxes, noDates: true },
      { key: 'low_stock', label: 'Low Stock', description: 'Items at or below reorder level', icon: AlertTriangle, noDates: true },
      { key: 'stock_movements', label: 'Stock Movements', description: 'Purchased, sold, returned and adjusted per item', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Customers & Suppliers',
    reports: [
      { key: 'customer_dues', label: 'Customer Dues', description: 'Unpaid and partly paid invoices with age', icon: Users },
      { key: 'purchases', label: 'Purchases by Supplier', description: 'Purchase totals per supplier', icon: Truck },
    ],
  },
]
const ALL_REPORTS = REPORT_GROUPS.flatMap((g) => g.reports)

const iso = (d) => d.toISOString().slice(0, 10)
function presetRange(preset) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (preset) {
    case 'today':
      return { from: iso(now), to: iso(now) }
    case 'last7':
      return { from: iso(new Date(y, m, now.getDate() - 6, 12)), to: iso(now) }
    case 'this_month':
      return { from: iso(new Date(y, m, 1, 12)), to: iso(now) }
    case 'last_month':
      return { from: iso(new Date(y, m - 1, 1, 12)), to: iso(new Date(y, m, 0, 12)) }
    case 'this_year':
      return { from: iso(new Date(y, 0, 1, 12)), to: iso(now) }
    default:
      return null
  }
}
const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_year', label: 'This year' },
]

const moneyFmt = new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const numberFmt = new Intl.NumberFormat('en-LK')
function formatValue(value, type) {
  if (value === null || value === undefined || value === '') return '—'
  if (type === 'money') return moneyFmt.format(value)
  if (type === 'number') return numberFmt.format(value)
  if (type === 'date') return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  return String(value)
}

function columnTotals(report) {
  if (!report.totals) return null
  return Object.fromEntries(
    report.columns
      .filter((c) => (c.type === 'money' || c.type === 'number') && !c.noTotal)
      .map((c) => [c.key, report.rows.reduce((sum, r) => sum + (Number(r[c.key]) || 0), 0)])
  )
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

export function ReportsPage() {
  const [reportKey, setReportKey] = useState('sales')
  const [filters, setFilters] = useState({ ...presetRange('this_month'), store_id: '' })
  // The report only re-runs when "Generate" is pressed (or another report is picked).
  const [applied, setApplied] = useState(filters)

  const definition = ALL_REPORTS.find((r) => r.key === reportKey)

  const storesQuery = useQuery({
    queryKey: ['stores', 'all'],
    queryFn: () => api.get('/stores', { params: { all: true } }).then((r) => r.data),
  })
  const stores = storesQuery.data?.data ?? []
  const storeLabel = stores.find((s) => String(s.id) === String(applied.store_id))

  const reportQuery = useQuery({
    queryKey: ['report', reportKey, applied],
    queryFn: () =>
      api
        .get(`/reports/${reportKey}`, {
          params: { from: applied.from, to: applied.to, store_id: applied.store_id || undefined },
        })
        .then((r) => r.data),
  })
  const report = reportQuery.data

  function selectReport(key) {
    setReportKey(key)
    setApplied(filters)
  }

  function exportCsv() {
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [report.columns.map((c) => cell(c.label)).join(',')]
    report.rows.forEach((r) => lines.push(report.columns.map((c) => cell(r[c.key])).join(',')))
    const totals = columnTotals(report)
    if (totals) lines.push(report.columns.map((c, i) => cell(i === 0 ? 'Total' : totals[c.key] ?? '')).join(','))

    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportKey}_${report.period.from}_to_${report.period.to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function printReport() {
    const win = window.open('', '_blank')
    if (!win) return
    const totals = columnTotals(report)
    const align = (c) => (c.type === 'money' || c.type === 'number' ? 'right' : 'left')
    const period = definition.noDates ? `As of ${formatValue(new Date(), 'date')}` : `${formatValue(report.period.from, 'date')} – ${formatValue(report.period.to, 'date')}`

    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: Arial, sans-serif; color: #111; font-size: 11px; }
        h1 { font-size: 18px; margin: 0; } .meta { color: #555; margin: 4px 0 12px; }
        .summary { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
        .tile { border: 1px solid #ddd; border-radius: 6px; padding: 6px 10px; min-width: 110px; }
        .tile .l { color: #666; font-size: 10px; } .tile .v { font-weight: bold; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #e5e5e5; padding: 5px 6px; }
        th { background: #f4f4f4; text-transform: uppercase; font-size: 9.5px; letter-spacing: .03em; }
        tfoot td { font-weight: bold; border-top: 2px solid #999; }
        .note { color: #666; margin-top: 8px; font-size: 10px; }
      </style></head><body>
      <h1>Janatha Motors — ${escapeHtml(report.title)}</h1>
      <div class="meta">${escapeHtml(period)}${storeLabel ? ` · Store: ${escapeHtml(storeLabel.code)}` : ' · All stores'} · Generated ${escapeHtml(new Date().toLocaleString('en-GB'))}</div>
      <div class="summary">${report.summary
        .map((s) => `<div class="tile"><div class="l">${escapeHtml(s.label)}</div><div class="v">${escapeHtml(formatValue(s.value, s.type))}</div></div>`)
        .join('')}</div>
      <table><thead><tr>${report.columns.map((c) => `<th style="text-align:${align(c)}">${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
      <tbody>${report.rows
        .map((r) => `<tr>${report.columns.map((c) => `<td style="text-align:${align(c)}">${escapeHtml(formatValue(r[c.key], c.type))}</td>`).join('')}</tr>`)
        .join('')}</tbody>
      ${totals ? `<tfoot><tr>${report.columns.map((c, i) => `<td style="text-align:${align(c)}">${i === 0 ? 'Total' : c.key in totals ? escapeHtml(formatValue(totals[c.key], c.type)) : ''}</td>`).join('')}</tr></tfoot>` : ''}
      </table>
      ${report.note ? `<p class="note">${escapeHtml(report.note)}</p>` : ''}
      <script>window.onload = () => window.print()</script>
      </body></html>`)
    win.document.close()
  }

  const totals = report ? columnTotals(report) : null

  return (
    <div>
      <PageHeader title="Reports" description="Generate sales, inventory and customer reports. Export to CSV or print / save as PDF." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        {/* Report picker */}
        <Card className="h-fit p-2">
          {REPORT_GROUPS.map((group) => (
            <div key={group.label} className="mb-2 last:mb-0">
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">{group.label}</p>
              {group.reports.map((r) => {
                const Icon = r.icon
                return (
                  <button
                    key={r.key}
                    onClick={() => selectReport(r.key)}
                    className={clsx(
                      'flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition',
                      r.key === reportKey ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink)] hover:bg-[var(--paper)]'
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      <span className="block text-sm font-semibold">{r.label}</span>
                      <span className="block text-[11px] leading-snug text-[var(--muted)]">{r.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </Card>

        <div className="min-w-0 space-y-4">
          {/* Filters */}
          <Card className="p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setApplied({ ...filters })
              }}
              className="flex flex-wrap items-end gap-3"
            >
              {!definition.noDates && (
                <>
                  <div className="w-40">
                    <Select
                      label="Period"
                      value=""
                      onChange={(e) => {
                        const range = presetRange(e.target.value)
                        if (range) setFilters({ ...filters, ...range })
                      }}
                    >
                      <option value="">Quick select…</option>
                      {PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-40">
                    <Input label="From" type="date" required value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
                  </div>
                  <div className="w-40">
                    <Input label="To" type="date" required value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
                  </div>
                </>
              )}
              <div className="w-52">
                <Select label="Store" value={filters.store_id} onChange={(e) => setFilters({ ...filters, store_id: e.target.value })}>
                  <option value="">All stores</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </Select>
              </div>
              <Button type="submit" disabled={reportQuery.isFetching}>
                {reportQuery.isFetching ? 'Generating…' : 'Generate'}
              </Button>
              {report && (
                <div className="ml-auto flex gap-2">
                  <Button type="button" variant="secondary" onClick={exportCsv} disabled={!report.rows.length}>
                    <Download className="h-4 w-4" /> CSV
                  </Button>
                  <Button type="button" variant="secondary" onClick={printReport}>
                    <Printer className="h-4 w-4" /> Print / PDF
                  </Button>
                </div>
              )}
            </form>
          </Card>

          {reportQuery.isError ? (
            <Card className="p-6 text-sm text-[var(--critical)]">{apiErrorMessage(reportQuery.error, 'Could not generate the report.')}</Card>
          ) : !report ? (
            <Card className="p-8 text-center text-sm text-[var(--muted)]">Generating report…</Card>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-bold text-[var(--ink)]">{report.title}</h2>
                <p className="text-xs text-[var(--muted)]">
                  {definition.noDates
                    ? 'Current position'
                    : `${formatValue(report.period.from, 'date')} – ${formatValue(report.period.to, 'date')}`}
                  {' · '}
                  {storeLabel ? `${storeLabel.name} (${storeLabel.code})` : 'All stores'}
                  {report.note && ` · ${report.note}`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {report.summary.map((s) => (
                  <Card key={s.label} className="p-4">
                    <p className="text-xs font-medium text-[var(--muted)]">{s.label}</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-[var(--ink)]">
                      {s.type === 'money' && <span className="mr-1 text-xs font-semibold text-[var(--muted)]">LKR</span>}
                      {formatValue(s.value, s.type)}
                    </p>
                  </Card>
                ))}
              </div>

              {report.chart && report.rows.length > 0 && <ReportChart report={report} />}

              <Card className="overflow-x-auto shadow-xs">
                {report.rows.length === 0 ? (
                  <EmptyState message="No data for the selected filters." />
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--line)] bg-[var(--paper)]/50 text-xs uppercase tracking-wide text-[var(--muted)]">
                        {report.columns.map((c) => (
                          <th key={c.key} className={clsx('whitespace-nowrap px-4 py-3', c.type === 'money' || c.type === 'number' ? 'text-right' : 'text-left')}>
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((r, i) => (
                        <tr key={i} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)]/40">
                          {report.columns.map((c) => (
                            <td
                              key={c.key}
                              className={clsx(
                                'px-4 py-2.5 text-xs',
                                c.type === 'money' || c.type === 'number' ? 'text-right tabular-nums' : 'text-left',
                                c.key === 'item_code' || c.key === 'invoice_no' ? 'font-mono font-semibold' : ''
                              )}
                            >
                              {formatValue(r[c.key], c.type)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    {totals && (
                      <tfoot>
                        <tr className="border-t-2 border-[var(--line)] bg-[var(--paper)]/50 font-bold">
                          {report.columns.map((c, i) => (
                            <td key={c.key} className={clsx('px-4 py-3 text-xs tabular-nums', c.type === 'money' || c.type === 'number' ? 'text-right' : 'text-left')}>
                              {i === 0 ? 'Total' : c.key in totals ? formatValue(totals[c.key], c.type) : ''}
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Single-series chart: area over time, or horizontal bars for ranked categories. */
function ReportChart({ report }) {
  const { type, x, y, label, limit, format } = report.chart
  const valueType = format ?? 'money'
  const data = limit ? report.rows.slice(0, limit) : report.rows
  const tooltipStyle = {
    contentStyle: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12, color: 'var(--ink)' },
    labelStyle: { color: 'var(--muted)' },
    formatter: (value) => [formatValue(value, valueType), report.columns.find((c) => c.key === y)?.label ?? y],
  }
  const tick = { fontSize: 11, fill: 'var(--muted)' }

  return (
    <Card className="p-5">
      <p className="mb-4 text-sm font-semibold text-[var(--ink)]">{label}</p>
      {type === 'area' ? (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="reportArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey={x} tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => formatValue(v, 'date').slice(0, 6)} />
            <YAxis tick={tick} axisLine={false} tickLine={false} width={80} tickFormatter={(v) => numberFmt.format(v)} />
            <Tooltip {...tooltipStyle} labelFormatter={(v) => formatValue(v, 'date')} cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 3' }} />
            <Area type="monotone" dataKey={y} stroke="var(--accent)" fill="url(#reportArea)" strokeWidth={2} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34 + 20)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid stroke="var(--line)" horizontal={false} />
            <XAxis type="number" tick={tick} axisLine={false} tickLine={false} tickFormatter={(v) => numberFmt.format(v)} />
            <YAxis type="category" dataKey={x} tick={tick} axisLine={false} tickLine={false} width={190} />
            <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--paper)' }} />
            <Bar dataKey={y} fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
