import { Fragment, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { api } from '../lib/api'
import { Card, EmptyState, Input, PageHeader, Select } from '../components/ui'

const CATEGORIES = [
  { value: 'auth', label: 'Sign-ins & sign-outs' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'whatsapp_order', label: 'WhatsApp orders' },
  { value: 'product', label: 'Products & stock' },
  { value: 'inventory', label: 'Inventory flush' },
  { value: 'stock_transfer', label: 'Stock transfers' },
  { value: 'customer', label: 'Customers' },
  { value: 'supplier', label: 'Suppliers' },
  { value: 'purchase', label: 'Purchases' },
  { value: 'shipment', label: 'Shipments' },
  { value: 'store', label: 'Stores' },
  { value: 'category', label: 'Categories' },
  { value: 'brand', label: 'Brands' },
  { value: 'user', label: 'Users' },
  { value: 'role', label: 'Roles' },
  { value: 'settings', label: 'Settings' },
]

const emptyFilters = { user_id: '', category: '', from: '', to: '' }

/** "Chrome on macOS"-style summary of a user agent string. */
function browserName(ua = '') {
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : null
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : null
  return [browser, os].filter(Boolean).join(' on ') || (ua ? ua.slice(0, 40) : '—')
}

function tone(action = '') {
  if (action.endsWith('_refused')) return 'critical'
  if (action.startsWith('auth.login_failed') || action.endsWith('.delete') || action.startsWith('inventory.flush')) return 'critical'
  if (action.startsWith('auth.')) return 'muted'
  if (action.endsWith('.create')) return 'success'
  return 'accent'
}

const toneClass = {
  critical: 'bg-[var(--critical-soft)] text-[var(--critical)]',
  success: 'bg-[var(--success-soft)] text-[var(--success)]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
  muted: 'bg-[var(--line)] text-[var(--muted)]',
}

export function ActivityLogPage() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const [expandAll, setExpandAll] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  function setFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  const usersQuery = useQuery({ queryKey: ['users', 'activity-filter'], queryFn: () => api.get('/users').then((r) => r.data) })
  const users = usersQuery.data?.data ?? usersQuery.data ?? []

  const logsQuery = useQuery({
    queryKey: ['activity-logs', debounced, filters, page],
    placeholderData: (prev) => prev,
    queryFn: () =>
      api
        .get('/activity-logs', {
          params: {
            page,
            search: debounced || undefined,
            user_id: filters.user_id || undefined,
            category: filters.category || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
          },
        })
        .then((r) => r.data),
  })
  const meta = logsQuery.data
  const logs = meta?.data ?? []
  const hasFilters = search || Object.values(filters).some(Boolean)

  return (
    <div>
      <PageHeader
        title="Activity Log"
        description="Every change, sign-in and download made in the system, with the user, IP address and Sri Lanka time. Visible to admins only."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity, user or IP…"
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="min-w-[9rem] flex-1 sm:w-44 sm:flex-none">
          <Select value={filters.user_id} onChange={(e) => setFilter('user_id', e.target.value)}>
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
            <option value="">All activity</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-36">
            <Input type="date" title="From (Sri Lanka date)" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
          </div>
          <span className="pb-2 text-xs text-[var(--muted)]">to</span>
          <div className="w-36">
            <Input type="date" title="To (Sri Lanka date)" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} />
          </div>
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setFilters(emptyFilters)
              setPage(1)
            }}
            className="inline-flex items-center gap-1 pb-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
        <label className="ml-auto flex cursor-pointer select-none items-center gap-2 pb-2 text-xs font-semibold text-[var(--ink)]">
          <input type="checkbox" checked={expandAll} onChange={(e) => setExpandAll(e.target.checked)} />
          Show full details for every entry
        </label>
      </div>

      <Card className="overflow-x-auto shadow-xs">
        {logsQuery.isLoading ? (
          <p className="p-8 text-center text-sm text-[var(--muted)]">Loading activity…</p>
        ) : logs.length === 0 ? (
          <EmptyState message={hasFilters ? 'No activity matches your filters.' : 'No activity recorded yet.'} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--paper)]/50 text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="whitespace-nowrap px-4 py-3">Time (Sri Lanka)</th>
                <th className="whitespace-nowrap px-4 py-3">User</th>
                <th className="px-4 py-3">Activity</th>
                <th className="whitespace-nowrap px-4 py-3">IP address</th>
                <th className="whitespace-nowrap px-4 py-3">Device</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const summary = changeSummary(log.changes)
                return (
                  <Fragment key={log.id}>
                    <tr className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)]/40">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[var(--ink)]">{log.created_at_lk}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <div className="font-semibold text-[var(--ink)]">{log.user?.name ?? '—'}</div>
                        {log.user?.email && <div className="text-[var(--muted)]">{log.user.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-[var(--ink)]">{log.description || log.action}</div>
                        <span className={clsx('mt-1 inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-bold', toneClass[tone(log.action)])}>
                          {log.action}
                        </span>
                        {summary && <div className="mt-1 text-[11px] text-[var(--muted)]">{summary}</div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[var(--ink)]">{log.ip_address || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--muted)]" title={log.user_agent || ''}>
                        {browserName(log.user_agent || '')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!expandAll && (
                          <button
                            type="button"
                            onClick={() => setOpen(open === log.id ? null : log.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-2)] hover:underline"
                          >
                            Details <ChevronDown className={clsx('h-3.5 w-3.5 transition', open === log.id && 'rotate-180')} />
                          </button>
                        )}
                      </td>
                    </tr>
                    {(expandAll || open === log.id) && (
                      <tr className="border-b border-[var(--line)] bg-[var(--paper)]/60">
                        <td colSpan={6} className="px-4 py-3">
                          <LogDetails log={log} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}

        {meta && meta.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)]">
            <span>
              Showing <strong className="text-[var(--ink)]">{meta.from}–{meta.to}</strong> of{' '}
              <strong className="text-[var(--ink)]">{meta.total}</strong> activities
            </span>
            {meta.last_page > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1.5 font-semibold text-[var(--ink)] hover:bg-[var(--paper)] disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <span>Page {meta.current_page} of {meta.last_page}</span>
                <button
                  type="button"
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1.5 font-semibold text-[var(--ink)] hover:bg-[var(--paper)] disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

const EVENT_STYLE = {
  created: { label: 'Created', cls: 'bg-[var(--success-soft)] text-[var(--success)]' },
  updated: { label: 'Changed', cls: 'bg-[var(--accent-soft)] text-[var(--accent)]' },
  deleted: { label: 'Deleted', cls: 'bg-[var(--critical-soft)] text-[var(--critical)]' },
}

/** "Product_id" → "Product", "selling_price" → "Selling price". */
function fieldLabel(key) {
  const k = String(key).replace(/_id$/, '').replace(/_/g, ' ')
  return k.charAt(0).toUpperCase() + k.slice(1)
}

function shown(value) {
  if (value === null || value === undefined || value === '') return <span className="text-[var(--muted)]">—</span>
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** One-line summary under the activity, e.g. "3 records changed: Invoice, 2 × Invoice Item". */
function changeSummary(changes) {
  const records = changes?.records ?? []
  if (!records.length) return changes?.error ? `Reason: ${changes.error}` : null
  const counts = {}
  for (const r of records) counts[r.type] = (counts[r.type] || 0) + 1
  const total = records.length + (changes.more || 0)
  const parts = Object.entries(counts).map(([type, n]) => (n > 1 ? `${n} × ${type}` : type))
  return `${total} record${total === 1 ? '' : 's'} affected: ${parts.join(', ')}${changes.more ? ', …' : ''}`
}

function LogDetails({ log }) {
  const changes = log.changes ?? {}
  const records = changes.records ?? []
  const input = changes.input && Object.keys(changes.input).length ? changes.input : null
  const extra = changes.details ?? null

  return (
    <div className="space-y-3 text-xs">
      {changes.error && (
        <div className="rounded-lg border border-[var(--critical)] bg-[var(--critical-soft)] px-3 py-2 font-semibold text-[var(--critical)]">
          Refused: {changes.error}
        </div>
      )}

      {records.length > 0 && (
        <div className="space-y-2">
          <p className="font-bold uppercase tracking-wide text-[var(--muted)]">What changed</p>
          {records.map((r, i) => {
            const style = EVENT_STYLE[r.event] ?? EVENT_STYLE.updated
            const fields = Object.entries(r.fields ?? {})
            return (
              <div key={i} className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
                <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-3 py-2">
                  <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase', style.cls)}>{style.label}</span>
                  <span className="font-semibold text-[var(--ink)]">{r.type}</span>
                  {r.label && <span className="text-[var(--ink)]">{r.label}</span>}
                  <span className="text-[var(--muted)]">#{r.id}</span>
                </div>
                {fields.length > 0 && (
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        <th className="w-1/4 px-3 py-1.5">Field</th>
                        {r.event !== 'created' && <th className="px-3 py-1.5">{r.event === 'deleted' ? 'Value' : 'Before'}</th>}
                        {r.event !== 'deleted' && <th className="px-3 py-1.5">{r.event === 'created' ? 'Value' : 'After'}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map(([key, [before, after]]) => (
                        <tr key={key} className="border-t border-[var(--line)] align-top">
                          <td className="px-3 py-1.5 font-semibold text-[var(--ink)]">{fieldLabel(key)}</td>
                          {r.event !== 'created' && (
                            <td className={clsx('break-words px-3 py-1.5', r.event === 'updated' && 'text-[var(--critical)] line-through decoration-1')}>{shown(before)}</td>
                          )}
                          {r.event !== 'deleted' && (
                            <td className={clsx('break-words px-3 py-1.5', r.event === 'updated' && 'font-semibold text-[var(--success)]')}>{shown(after)}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}
          {changes.more > 0 && (
            <p className="text-[var(--muted)]">…and {changes.more} more record{changes.more === 1 ? '' : 's'} (bulk change; only the first 300 are listed).</p>
          )}
        </div>
      )}

      {extra && (
        <div>
          <p className="mb-1 font-bold uppercase tracking-wide text-[var(--muted)]">Notes</p>
          <KeyValues data={extra} />
        </div>
      )}

      {input && (
        <details className="rounded-lg border border-[var(--line)] bg-[var(--surface)]" open={records.length === 0}>
          <summary className="cursor-pointer px-3 py-2 font-bold uppercase tracking-wide text-[var(--muted)]">Data submitted</summary>
          <div className="border-t border-[var(--line)] p-3">
            <KeyValues data={input} />
          </div>
        </details>
      )}

      <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-[11px] text-[var(--muted)] sm:grid-cols-2">
        <div><b className="text-[var(--ink)]">Request:</b> {log.method} {log.path} · status {log.status}</div>
        <div><b className="text-[var(--ink)]">IP address:</b> {log.ip_address || '—'}</div>
        <div className="sm:col-span-2 break-words"><b className="text-[var(--ink)]">Device / browser:</b> {log.user_agent || '—'}</div>
      </div>
    </div>
  )
}

/** Submitted form data as a readable list; nested lists (invoice lines etc.) as small tables. */
function KeyValues({ data }) {
  if (data == null || typeof data !== 'object') return <span>{shown(data)}</span>
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
      {Object.entries(data).map(([key, value]) => {
        const rows = Array.isArray(value) && value.length && typeof value[0] === 'object' ? value : null
        return (
          <div key={key} className={clsx(rows && 'sm:col-span-2')}>
            <dt className="font-semibold text-[var(--ink)]">{fieldLabel(key)}</dt>
            <dd className="break-words text-[var(--muted)]">
              {rows ? (
                <div className="mt-1 overflow-x-auto rounded border border-[var(--line)]">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-[10px] uppercase text-[var(--muted)]">
                        {Object.keys(rows[0]).map((k) => <th key={k} className="px-2 py-1">{fieldLabel(k)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className="border-t border-[var(--line)]">
                          {Object.keys(rows[0]).map((k) => <td key={k} className="px-2 py-1 text-[var(--ink)]">{shown(row[k])}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : Array.isArray(value) ? value.map((v) => shown(v)).join(', ') : shown(value)}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
