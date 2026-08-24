import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import {
  LayoutDashboard,
  Receipt,
  Package,
  Car,
  Users,
  Truck,
  Store,
  ArrowLeftRight,
  UserCheck,
  Shield,
  Settings,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import logo from '../assets/logo.webp'

const NAV = [
  { to: '/', label: 'Dashboard', permission: 'view_dashboard', icon: LayoutDashboard, end: true },
  { to: '/invoices', label: 'Invoices', permission: 'create_invoice', icon: Receipt },
  { to: '/products', label: 'Inventory', permission: 'manage_products', icon: Package },
  { to: '/brands', label: 'Brands & Vehicles', permission: 'manage_products', icon: Car },
  { to: '/customers', label: 'Customers', permission: 'manage_customers', icon: Users },
  { to: '/suppliers', label: 'Suppliers & Purchases', permission: 'manage_suppliers', icon: Truck },
  { to: '/stores', label: 'Stores & Outlets', permission: 'manage_stores', icon: Store },
  { to: '/stock-transfers', label: 'Stock Transfers', permission: 'manage_stock', icon: ArrowLeftRight },
  { to: '/users', label: 'Users', permission: 'manage_users', icon: UserCheck },
  { to: '/roles', label: 'Roles & Permissions', permission: 'manage_roles', icon: Shield },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper)] transition"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Moon className="h-3.5 w-3.5 text-amber-400" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
      <span className="hidden sm:inline">{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  )
}

export function AppShell() {
  const { user, can, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Auto-close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface)] p-5 md:flex">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 border border-[var(--line)] shadow-xs">
            <img src={logo} alt="Janatha Motors" className="h-full w-full object-contain rounded-full" />
          </div>
          <div>
            <p className="text-base font-extrabold leading-tight tracking-tight">Janatha Motors</p>
            <p className="text-xs text-[var(--muted)]">Invoice & Inventory</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.filter((item) => !item.permission || can(item.permission)).map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold'
                      : 'text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Slide-Over Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Slide-Over Drawer */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[var(--line)] bg-[var(--surface)] p-5 transition-transform duration-300 md:hidden shadow-2xl',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 border border-[var(--line)]">
              <img src={logo} alt="Janatha Motors" className="h-full w-full object-contain rounded-full" />
            </div>
            <div>
              <p className="text-base font-extrabold leading-tight">Janatha Motors</p>
              <p className="text-xs text-[var(--muted)]">Invoice & Inventory</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto flex-1 pr-1">
          {NAV.filter((item) => !item.permission || can(item.permission)).map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition',
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold'
                      : 'text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]'
                  )
                }
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="pt-4 border-t border-[var(--line)] flex items-center justify-between">
          <div>
            <p className="text-xs font-bold leading-tight">{user?.name}</p>
            <p className="text-[11px] text-[var(--muted)]">{user?.roles?.[0]}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs font-bold text-[var(--critical)] hover:bg-[var(--critical-soft)] transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)]/90 backdrop-blur-md px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-[var(--line)] p-2 text-[var(--ink)] hover:bg-[var(--paper)] md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 md:hidden">
              <img src={logo} alt="Janatha Motors" className="h-7 w-7 rounded-full object-contain" />
              <span className="text-sm font-extrabold tracking-tight">Janatha Motors</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold leading-tight">{user?.name}</p>
                <p className="text-xs text-[var(--muted)] leading-tight">{user?.roles?.[0]}</p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--paper)] transition"
              >
                <LogOut className="h-3.5 w-3.5 text-[var(--muted)]" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
