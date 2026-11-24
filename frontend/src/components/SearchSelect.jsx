import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { ChevronDown, Search, X } from 'lucide-react'

/**
 * Select2-style dropdown for a list already loaded on the page: a closed field showing the
 * choice, opening to a search box with keyboard navigation and a clear (×) button.
 *
 * options: [{ value, label, hint?, group?, indent? }]  value '' means "nothing selected".
 */
export function SearchSelect({ value, onChange, options, placeholder = 'All', searchPlaceholder = 'Type to search…', className }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useRef(null)
  const searchRef = useRef(null)
  const listRef = useRef(null)

  const selected = options.find((o) => String(o.value) === String(value))

  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return options
    return options.filter((o) => {
      const text = `${o.label} ${o.hint || ''} ${o.group || ''}`.toLowerCase()
      return words.every((w) => text.includes(w))
    })
  }, [options, query])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0)
    else setQuery('')
  }, [open])

  useEffect(() => setHighlight(0), [query])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${highlight}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [highlight])

  function choose(option) {
    onChange(option ? String(option.value) : '')
    setOpen(false)
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

  let lastGroup = null

  return (
    <div ref={wrapperRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'flex w-full items-center gap-2 rounded-lg border bg-[var(--surface)] px-3 py-2 text-left text-sm outline-none transition',
          open ? 'border-[var(--accent)]' : 'border-[var(--line)] hover:border-[var(--muted)]'
        )}
      >
        <span className={clsx('flex-1 truncate', selected ? 'text-[var(--ink)]' : 'text-[var(--muted)]')}>
          {selected ? (selected.group && !selected.isGroupItem ? `${selected.group} · ${selected.label}` : selected.label) : placeholder}
        </span>
        {selected ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear"
            onClick={(e) => {
              e.stopPropagation()
              choose(null)
            }}
            className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 min-w-[15rem] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-xl">
          <div className="relative border-b border-[var(--line)] p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              ref={searchRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-[var(--line)] bg-[var(--paper)] py-1.5 pl-8 pr-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <ul ref={listRef} className="max-h-72 overflow-y-auto py-1">
            {!query && (
              <li>
                <button
                  type="button"
                  onClick={() => choose(null)}
                  className="w-full px-3 py-2 text-left text-sm text-[var(--muted)] hover:bg-[var(--paper)]"
                >
                  {placeholder}
                </button>
              </li>
            )}
            {results.map((o, i) => {
              const showGroup = o.group && o.group !== lastGroup
              lastGroup = o.group
              return (
                <li key={o.value}>
                  {showGroup && (
                    <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{o.group}</div>
                  )}
                  <button
                    type="button"
                    data-index={i}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => choose(o)}
                    className={clsx(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm',
                      o.indent && 'pl-7',
                      i === highlight ? 'bg-[var(--accent-soft)] text-[var(--ink)]' : 'text-[var(--ink)]',
                      String(o.value) === String(value) && 'font-bold text-[var(--accent)]'
                    )}
                  >
                    <span className="truncate">{o.label}</span>
                    {o.hint && <span className="shrink-0 text-xs text-[var(--muted)]">{o.hint}</span>}
                  </button>
                </li>
              )
            })}
            {results.length === 0 && <li className="px-3 py-3 text-center text-sm text-[var(--muted)]">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
