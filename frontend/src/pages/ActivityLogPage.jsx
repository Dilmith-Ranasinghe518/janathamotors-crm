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
                const details = log.changes ?? null
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
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[var(--ink)]">{log.ip_address || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--muted)]" title={log.user_agent || ''}>
                        {browserName(log.user_agent || '')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {details && (
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
                    {open === log.id && details && (
                      <tr className="border-b border-[var(--line)] bg-[var(--paper)]/60">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="mb-1 text-[11px] text-[var(--muted)]">
                            {log.method} {log.path} · status {log.status}
                          </div>
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 font-mono text-[11px] text-[var(--ink)]">
                            {JSON.stringify(details, null, 2)}
                          </pre>
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
