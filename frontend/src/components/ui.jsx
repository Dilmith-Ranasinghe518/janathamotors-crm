import clsx from 'clsx'

export function Card({ className, children }) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-sm',
        className
      )}
    >
      {children}
    </div>
  )
}

export function Button({ variant = 'primary', className, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold px-4 py-2 transition disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-[var(--accent)] text-white hover:opacity-90',
    secondary: 'bg-transparent border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper)]',
    ghost: 'bg-transparent text-[var(--muted)] hover:text-[var(--ink)]',
    danger: 'bg-[var(--critical)] text-white hover:opacity-90',
  }
  return <button className={clsx(base, variants[variant], className)} {...props} />
}

export function Input({ label, error, className, containerClassName, ...props }) {
  const colSpanClass = className?.split(' ').filter((c) => c.startsWith('col-span') || c.startsWith('md:col-span') || c.startsWith('lg:col-span')).join(' ')
  const inputClass = className?.split(' ').filter((c) => !c.startsWith('col-span') && !c.startsWith('md:col-span') && !c.startsWith('lg:col-span')).join(' ')

  return (
    <label className={clsx('flex flex-col gap-1 text-sm', containerClassName, colSpanClass)}>
      {label && <span className="font-medium text-[var(--ink)]">{label}</span>}
      <input
        className={clsx(
          'w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent)]',
          inputClass
        )}
        {...props}
      />
      {error && <span className="text-xs text-[var(--critical)]">{error}</span>}
    </label>
  )
}

export function Select({ label, error, className, containerClassName, children, ...props }) {
  const colSpanClass = className?.split(' ').filter((c) => c.startsWith('col-span') || c.startsWith('md:col-span') || c.startsWith('lg:col-span')).join(' ')
  const inputClass = className?.split(' ').filter((c) => !c.startsWith('col-span') && !c.startsWith('md:col-span') && !c.startsWith('lg:col-span')).join(' ')

  return (
    <label className={clsx('flex flex-col gap-1 text-sm', containerClassName, colSpanClass)}>
      {label && <span className="font-medium text-[var(--ink)]">{label}</span>}
      <select
        className={clsx(
          'w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent)]',
          inputClass
        )}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-[var(--critical)]">{error}</span>}
    </label>
  )
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--ink)]">{title}</h1>
        {description && <p className="text-sm text-[var(--muted)] mt-1">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

const statusStyles = {
  paid: 'bg-[var(--success-soft)] text-[var(--success)]',
  partial: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  due: 'bg-[var(--critical-soft)] text-[var(--critical)]',
  cancelled: 'bg-[var(--line)] text-[var(--muted)]',
}

export function StatusBadge({ status }) {
  return (
    <span
      className={clsx(
        'inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
        statusStyles[status] || 'bg-[var(--line)] text-[var(--muted)]'
      )}
    >
      {status}
    </span>
  )
}

export function EmptyState({ message }) {
  return (
    <div className="py-16 text-center text-sm text-[var(--muted)]">{message}</div>
  )
}

export function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12 backdrop-blur-xs">
      <div
        className={clsx(
          'w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-2xl transition-all',
          wide ? 'max-w-3xl' : 'max-w-md'
        )}
      >
        <div className="mb-4 flex items-center justify-between border-b border-[var(--line)] pb-3">
          <h2 className="text-lg font-bold text-[var(--ink)]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
