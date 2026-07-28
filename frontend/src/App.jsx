import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/AppShell'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProductsPage } from './pages/ProductsPage'
import { BrandsPage } from './pages/BrandsPage'
import { CustomersPage } from './pages/CustomersPage'
import { CustomerDetailPage } from './pages/CustomerDetailPage'
import { SuppliersPage } from './pages/SuppliersPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { InvoiceCreatePage } from './pages/InvoiceCreatePage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { UsersPage } from './pages/UsersPage'
import { RolesPage } from './pages/RolesPage'
import { SettingsPage } from './pages/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2 text-center">
      <p className="text-lg font-semibold text-[var(--ink)]">Page not found</p>
      <p className="text-sm text-[var(--muted)]">Check the address or use the navigation.</p>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />

                  <Route element={<ProtectedRoute permission="create_invoice" />}>
                    <Route path="/invoices" element={<InvoicesPage />} />
                    <Route path="/invoices/new" element={<InvoiceCreatePage />} />
                    <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
                  </Route>

                  <Route element={<ProtectedRoute permission="manage_products" />}>
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/brands" element={<BrandsPage />} />
                  </Route>

                  <Route element={<ProtectedRoute permission="manage_customers" />}>
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/customers/:id" element={<CustomerDetailPage />} />
                  </Route>

                  <Route element={<ProtectedRoute permission="manage_suppliers" />}>
                    <Route path="/suppliers" element={<SuppliersPage />} />
                  </Route>

                  <Route element={<ProtectedRoute permission="manage_users" />}>
                    <Route path="/users" element={<UsersPage />} />
                  </Route>

                  <Route element={<ProtectedRoute permission="manage_roles" />}>
                    <Route path="/roles" element={<RolesPage />} />
                  </Route>

                  <Route element={<ProtectedRoute permission="manage_settings" />}>
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
