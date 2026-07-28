import { NavLink, Outlet } from 'react-router-dom'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import logo from '../assets/logo.webp'

const NAV = [
  { to: '/', label: 'Dashboard', permission: 'view_dashboard', end: true },
  { to: '/invoices', label: 'Invoices', permission: 'create_invoice' },
  { to: '/products', label: 'Inventory', permission: 'manage_products' },
  { to: '/customers', label: 'Customers', permission: 'manage_customers' },
  { to: '/suppliers', label: 'Suppliers & Purchases', permission: 'manage_suppliers' },
  { to: '/users', label: 'Users', permission: 'manage_users' },
  { to: '/roles', label: 'Roles & Permissions', permission: 'manage_roles' },
  { to: '/settings', label: 'Settings', permission: 'manage_settings' },
]

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)]"
      aria-label="Toggle theme"
    >
      <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
      {theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  )
}

export function AppShell() {
  const { user, can, logout } = useAuth()

  return (
    <div className="flex min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface)] p-5 md:flex">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-sm">
            <img src={logo} alt="Janatha Motors" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-base font-extrabold leading-tight tracking-tight">Janatha Motors</p>
            <p className="text-xs text-[var(--muted)]">Invoice & Inventory</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.filter((item) => can(item.permission)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-6 py-3">
          <p className="text-sm text-[var(--muted)] md:hidden font-semibold">Janatha Motors</p>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold leading-tight">{user?.name}</p>
                <p className="text-xs text-[var(--muted)] leading-tight">{user?.roles?.[0]}</p>
              </div>
              <button
                onClick={logout}
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--paper)]"
              >
                Log out
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
