import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../lib/api'
import { Card, PageHeader, EmptyState } from '../components/ui'

function currency(value) {
  return `Rs. ${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
}

function StatCard({ label, value }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--ink)]">{value}</p>
    </Card>
  )
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
  })

  if (isLoading) return <p className="text-sm text-[var(--muted)]">Loading dashboard…</p>

  return (
    <div>
      <PageHeader title="Dashboard" description="Today's snapshot across sales, stock, and dues." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sales today" value={currency(data.sales_today)} />
        <StatCard label="Sales this week" value={currency(data.sales_this_week)} />
        <StatCard label="Sales this month" value={currency(data.sales_this_month)} />
        <StatCard label="Outstanding due" value={currency(data.outstanding_due)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <p className="mb-4 text-sm font-semibold text-[var(--ink)]">Revenue — last 14 days</p>
          {data.revenue_trend?.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.revenue_trend}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(value) => currency(value)} />
                <Area type="monotone" dataKey="total" stroke="var(--accent)" fill="url(#revenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No sales recorded in the last 14 days yet." />
          )}
        </Card>

        <Card className="p-5">
          <p className="mb-4 text-sm font-semibold text-[var(--ink)]">Low stock</p>
          {data.low_stock_products?.length ? (
            <ul className="flex flex-col gap-3">
              {data.low_stock_products.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="rounded-full bg-[var(--critical-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--critical)]">
                    reorder ≤ {p.reorder_level}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="Nothing below reorder level." />
          )}
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <p className="mb-4 text-sm font-semibold text-[var(--ink)]">Top-selling parts this month</p>
        {data.top_selling_products?.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="pb-2">Product</th>
                <th className="pb-2 text-right">Units sold</th>
              </tr>
            </thead>
            <tbody>
              {data.top_selling_products.map((p) => (
                <tr key={p.id} className="border-t border-[var(--line)]">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2 text-right tabular-nums">{p.quantity_sold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No sales yet this month." />
        )}
      </Card>
    </div>
  )
}
