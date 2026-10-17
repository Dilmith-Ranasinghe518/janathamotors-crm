import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ChevronDown, Search, User, X } from 'lucide-react'
import { api } from '../lib/api'

/**
 * Select2-style customer picker: a closed field showing the selection, opening to a
 * search box + server-side results (so every customer is reachable, not just the first page).
 */
export function CustomerSelect({ value, onChange, required = false, invalid = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250)
    return () => clearTimeout(t)
  }, [query])

  const customersQuery = useQuery({
    queryKey: ['customers', 'select', debounced],
    queryFn: () => api.get('/customers', { params: { search: debounced || undefined } }).then((r) => r.data.data),
    enabled: open,
  })
  const results = customersQuery.data ?? []

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open) {
      setHighlight(0)
      setTimeout(() => searchRef.current?.focus(), 0)
    }
  }, [open])

  function choose(customer) {
    onChange(customer)
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[highlight]) choose(results[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        <User className="h-3.5 w-3.5 text-[var(--accent)]" />
        <span>Customer{required && <span className="text-[var(--critical)]"> *</span>}</span>
      </label>

      <div
        role="combobox"
        aria-expanded={open}
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className={clsx(
          'flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border bg-[var(--paper)] px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]',
          invalid ? 'border-[var(--critical)]' : open ? 'border-[var(--accent)]' : 'border-[var(--line)]'
        )}
      >
        {value ? (
          <span className="min-w-0 truncate">
            <span className="font-semibold text-[var(--ink)]">{value.name}</span>
            {value.phone && <span className="ml-2 font-mono text-xs text-[var(--muted)]">{value.phone}</span>}
          </span>
        ) : (
          <span className="text-[var(--muted)]">— Select customer —</span>
        )}
        <span className="flex shrink-0 items-center gap-1 text-[var(--muted)]">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange(null)
              }}
              className="rounded p-0.5 hover:text-[var(--ink)]"
              aria-label="Clear customer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown className={clsx('h-4 w-4 transition', open && 'rotate-180')} />
        </span>
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-2xl">
          <div className="relative mb-1.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setHighlight(0)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search name or phone…"
              className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] py-2 pl-8 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {customersQuery.isLoading ? (
              <li className="px-3 py-2 text-xs text-[var(--muted)]">Searching…</li>
            ) : results.length === 0 ? (
              <li className="px-3 py-2 text-xs text-[var(--muted)]">No customers found. Add them under Customers first.</li>
            ) : (
              results.map((c, i) => (
                <li
                  key={c.id}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => choose(c)}
                  className={clsx(
                    'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm',
                    i === highlight && 'bg-[var(--accent-soft)]',
                    value?.id === c.id && 'font-semibold'
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[var(--ink)]">{c.name}</span>
                    {c.phone && <span className="font-mono text-xs text-[var(--muted)]">{c.phone}</span>}
                  </span>
                  {Number(c.current_due) > 0 && (
                    <span className="shrink-0 rounded-full bg-[var(--critical-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--critical)]">
                      Due {Number(c.current_due).toFixed(2)}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
