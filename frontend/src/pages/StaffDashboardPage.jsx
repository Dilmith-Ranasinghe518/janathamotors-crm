import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, ArrowRight, FileDown, ScanLine, Search, Wallet } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { PartsFinder } from '../components/PartsFinder'
import { Button, Card, EmptyState, PageHeader } from '../components/ui'

/** Big tap target for the main staff tasks. */
function ActionTile({ icon: Icon, title, text, onClick, to }) {
  const body = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-[var(--ink)]">{title}</span>
        <span className="block text-sm text-[var(--muted)]">{text}</span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-[var(--muted)]" />
    </>
  )
  const cls =
    'flex w-full items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-left shadow-xs transition hover:border-[var(--accent)] hover:shadow-md'
  return to ? (
    <Link to={to} className={cls}>{body}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{body}</button>
  )
}

/** Home page for the Staff role: find parts, move stock between stores, petty cash. */
export function StaffDashboardPage() {
  const { user, can } = useAuth()
  const [finderOpen, setFinderOpen] = useState(false)
  const [poLoadingId, setPoLoadingId] = useState(null)
  const canTransfer = can('manage_stock|create_stock_transfer')
  const canFind = can('find_parts|manage_products|create_invoice')

  const transfersQuery = useQuery({
    queryKey: ['stock-transfers', 'recent'],
    queryFn: () => api.get('/stock-transfers').then((r) => r.data),
    enabled: canTransfer,
  })
  const recent = (transfersQuery.data?.data ?? []).slice(0, 6)

  async function openPo(transfer) {
    setPoLoadingId(transfer.id)
    try {
      const response = await api.get(`/stock-transfers/${transfer.id}/po`, { responseType: 'blob' })
      window.open(URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' })), '_blank')
    } catch (error) {
      window.alert(apiErrorMessage(error, 'Could not create the PO.'))
    } finally {
      setPoLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Hello, ${user?.name?.split(' ')[0] ?? 'there'}`} description="Find parts and move stock between stores." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {canFind && (
          <ActionTile
            icon={Search}
            title="Find Parts"
            text="Scan a part's QR label or type its code to see stock, price and rack location."
            onClick={() => setFinderOpen(true)}
          />
        )}
        {canTransfer && (
          <ActionTile
            icon={ArrowLeftRight}
            title="New Stock Transfer"
            text="Move parts from one store to another and print the PO."
            to="/stock-transfers?new=1"
          />
        )}
        {canTransfer && (
          <ActionTile
            icon={ScanLine}
            title="Scan to Transfer"
            text="Start a transfer with the camera on and scan each part's QR."
            to="/stock-transfers?new=scan"
          />
        )}
        {can('view_petty_cash') && (
          <ActionTile icon={Wallet} title="Petty Cash" text="Request petty cash and see your requests." to="/petty-cash" />
        )}
      </div>

      {canTransfer && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
            <p className="text-sm font-bold text-[var(--ink)]">Recent stock transfers</p>
            <Link to="/stock-transfers" className="text-xs font-semibold text-[var(--accent)] hover:underline">View all</Link>
          </div>
          {transfersQuery.isLoading ? (
            <p className="p-6 text-center text-sm text-[var(--muted)]">Loading…</p>
          ) : recent.length === 0 ? (
            <EmptyState message="No stock transfers yet." />
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {recent.map((t) => {
                const qty = (t.items ?? []).reduce((sum, i) => sum + Number(i.quantity || 0), 0)
                return (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-[var(--ink)]">{t.po_no || t.transfer_no}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {String(t.transferred_at ?? '').slice(0, 10)} · <b>{t.from_store?.code}</b> → <b>{t.to_store?.code}</b> ·{' '}
                        {(t.items ?? []).length} item{(t.items ?? []).length === 1 ? '' : 's'}, qty {qty}
                        {t.creator?.name ? ` · by ${t.creator.name}` : ''}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      className="flex items-center gap-1 px-2.5 py-1 text-xs"
                      onClick={() => openPo(t)}
                      disabled={poLoadingId === t.id}
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span>{poLoadingId === t.id ? '…' : 'PO'}</span>
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      )}

      {finderOpen && <PartsFinder onClose={() => setFinderOpen(false)} />}
    </div>
  )
}
