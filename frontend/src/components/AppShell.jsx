import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
  Ship,
  MessageCircle,
  BarChart3,
  UserCheck,
  Shield,
  Settings,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { api } from '../lib/api'
import logo from '../assets/logo.webp'
import { SoftwareCredit } from './SoftwareCredit'

const NAV = [
  { to: '/', label: 'Dashboard', permission: 'view_dashboard', icon: LayoutDashboard, end: true },
  { to: '/invoices', label: 'Invoices', permission: 'create_invoice', icon: Receipt },
  { to: '/whatsapp-orders', label: 'WhatsApp Orders', permission: 'manage_orders', icon: MessageCircle },
  { to: '/products', label: 'Inventory', permission: 'manage_products', icon: Package },
  { to: '/brands', label: 'Brands & Vehicles', permission: 'manage_products', icon: Car },
  { to: '/customers', label: 'Customers', permission: 'manage_customers', icon: Users },
  { to: '/suppliers', label: 'Suppliers & Purchases', permission: 'manage_suppliers', icon: Truck },
  { to: '/stores', label: 'Stores & Outlets', permission: 'manage_stores', icon: Store },
  { to: '/stock-transfers', label: 'Stock Transfers', permission: 'manage_stock', icon: ArrowLeftRight },
  { to: '/shipments', label: 'Shipments', permission: 'manage_shipments', icon: Ship },
  { to: '/reports', label: 'Reports', permission: 'view_reports', icon: BarChart3 },
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('jms_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })
  const location = useLocation()

  const { data: maintenanceInfo } = useQuery({
    queryKey: ['maintenance-status'],
    queryFn: () => api.get('/maintenance-status').then((r) => r.data),
    refetchInterval: 30000,
  })

  const handleConfirmLogout = async () => {
    try {
      setLoggingOut(true)
      await logout()
    } finally {
      setLoggingOut(false)
      setShowLogoutConfirm(false)
    }
  }

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('jms_sidebar_collapsed', String(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  // Auto-close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const visibleNavItems = NAV.filter((item) => !item.permission || can(item.permission))

  return (
    <div className="flex min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      {/* Desktop Sidebar */}
      <aside
        className={clsx(
          'hidden shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface)] sticky top-0 h-screen transition-all duration-300 ease-in-out md:flex z-30',
          collapsed ? 'w-20 p-3' : 'w-64 p-5'
        )}
      >
        {/* Sidebar Brand Header */}
        <div
          className={clsx(
            'mb-6 flex items-center transition-all duration-300',
            collapsed ? 'flex-col gap-2.5 justify-center' : 'justify-between gap-3'
          )}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 border border-[var(--line)] shadow-xs">
              <img src={logo} alt="Janatha Motors" className="h-full w-full object-contain rounded-full" />
            </div>
            {!collapsed && (
              <div className="truncate min-w-0">
                <p className="text-sm font-extrabold leading-tight tracking-tight truncate">Janatha Motors</p>
                <p className="text-xs text-[var(--muted)] truncate">Invoice & Inventory</p>
              </div>
            )}
          </div>

          {/* Collapse/Expand Toggle Button */}
          <button
            onClick={toggleCollapse}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)] transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-0.5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'group relative flex items-center rounded-xl text-sm font-semibold transition',
                    collapsed ? 'justify-center p-3' : 'gap-3 px-3.5 py-2.5',
                    isActive
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold shadow-xs'
                      : 'text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]'
                  )
                }
              >
                <Icon className={clsx('shrink-0', collapsed ? 'h-5 w-5' : 'h-4 w-4')} />
                {!collapsed ? (
                  <span className="truncate">{item.label}</span>
                ) : (
                  /* Floating Tooltip when Collapsed */
                  <span className="pointer-events-none absolute left-full ml-3.5 z-50 hidden rounded-md bg-[var(--ink)] px-2.5 py-1 text-xs font-semibold text-[var(--surface)] shadow-lg whitespace-nowrap group-hover:block">
                    {item.label}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Sidebar Footer (User details or quick logout) */}
        <div className="pt-3 mt-2 border-t border-[var(--line)]">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="truncate min-w-0">
                <p className="text-xs font-bold leading-tight truncate">{user?.name}</p>
                <p className="text-[11px] text-[var(--muted)] truncate">{user?.roles?.[0]}</p>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--critical)] transition"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="group relative flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--critical)] transition"
                aria-label="Log out"
              >
                <LogOut className="h-4.5 w-4.5" />
                <span className="pointer-events-none absolute left-full ml-3.5 z-50 hidden rounded-md bg-[var(--ink)] px-2.5 py-1 text-xs font-semibold text-[var(--surface)] shadow-lg whitespace-nowrap group-hover:block">
                  Log out ({user?.name})
                </span>
              </button>
            </div>
          )}
          <div className={clsx('mt-3 flex', collapsed ? 'justify-center' : '')}>
            <SoftwareCredit compact={collapsed} />
          </div>
        </div>
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
          {visibleNavItems.map((item) => {
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
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs font-bold text-[var(--critical)] hover:bg-[var(--critical-soft)] transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        </div>
        <SoftwareCredit className="mt-3" />
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {maintenanceInfo?.maintenance_mode && (
          <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold flex items-center justify-between border-b border-amber-600/30 shrink-0 z-30 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-900 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-950"></span>
              </span>
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-950" />
              <span>MAINTENANCE MODE ACTIVE — Non-admin users are locked out and sessions terminated.</span>
            </div>
            {can('manage_settings') && (
              <Link to="/settings" className="underline hover:text-black shrink-0 ml-3">
                Manage in Settings →
              </Link>
            )}
          </div>
        )}

        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)]/90 backdrop-blur-md px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3">
            {/* Mobile Open Drawer Button */}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-[var(--line)] p-2 text-[var(--ink)] hover:bg-[var(--paper)] md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Mobile Brand Title */}
            <div className="flex items-center gap-2 md:hidden">
              <img src={logo} alt="Janatha Motors" className="h-7 w-7 rounded-full object-contain" />
              <span className="text-sm font-extrabold tracking-tight">Janatha Motors</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => !loggingOut && setShowLogoutConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5 mb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1 border border-[var(--line)] shadow-xs">
                <img src={logo} alt="Janatha Motors" className="h-full w-full object-contain rounded-full" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--ink)]">Log Out</h3>
                <p className="text-xs text-[var(--muted)]">Sign out of Janatha Motors</p>
              </div>
            </div>

            <p className="text-sm text-[var(--muted)] leading-relaxed mb-4">
              Are you sure you want to log out? Any unsaved changes in current forms will be lost.
            </p>

            {user && (
              <div className="mb-5 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3 text-xs">
                <p className="font-semibold text-[var(--ink)]">{user.name}</p>
                <p className="text-[var(--muted)] truncate">{user.email || user.roles?.[0]}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleConfirmLogout}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--critical)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50 shadow-xs"
              >
                <LogOut className="h-4 w-4" />
                <span>{loggingOut ? 'Logging out…' : 'Log out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
