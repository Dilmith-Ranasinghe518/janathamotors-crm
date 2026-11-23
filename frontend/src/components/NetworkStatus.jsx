import { useState } from 'react'
import clsx from 'clsx'
import { CloudOff, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { useNetwork } from '../context/NetworkContext'
import { Button, Modal } from './ui'

const money = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Bill total as the server will calculate it (VAT is already inside the prices). */
function billTotal(payload) {
  const lines = (payload.items || []).reduce((sum, i) => sum + i.quantity * i.unit_price - (i.discount || 0), 0)
  return lines - (payload.discount || 0)
}

/** Header pill: Online / Offline mode, with the number of bills waiting to upload. Opens the panel. */
export function NetworkStatusPill() {
  const { mode, queue } = useNetwork()
  const [open, setOpen] = useState(false)
  const offline = mode === 'offline'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={offline ? 'Offline mode — click for details' : 'Online — click for details'}
        className={clsx(
          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition',
          offline
            ? 'border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]'
            : 'border-[var(--line)] bg-[var(--surface)] text-[var(--success)] hover:bg-[var(--paper)]'
        )}
      >
        {offline ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
        <span>{offline ? 'Offline mode' : 'Online'}</span>
        {queue.length > 0 && (
          <span className="rounded-full bg-[var(--warning)] px-1.5 text-[10px] text-white">{queue.length} unsynced</span>
        )}
      </button>
      {open && <NetworkPanel onClose={() => setOpen(false)} />}
    </>
  )
}

/** Banners under the header: offline notice, "network is back" prompt, and the last upload result. */
export function NetworkBanners() {
  const { mode, networkAvailable, queue, syncing, goOnline, lastSync, clearLastSync } = useNetwork()
  const offline = mode === 'offline'

  return (
    <>
      {offline && networkAvailable && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--success)] bg-[var(--success-soft)] px-4 py-3 text-sm font-semibold text-[var(--success)]">
          <span className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            The network is available again.
            {queue.length > 0 && ` Switch to online mode to upload ${queue.length} saved bill${queue.length === 1 ? '' : 's'}.`}
          </span>
          <Button onClick={goOnline} disabled={syncing} className="bg-[var(--success)] py-1.5 text-xs">
            {syncing ? 'Uploading…' : 'Switch to online mode'}
          </Button>
        </div>
      )}
      {offline && !networkAvailable && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm font-semibold text-[var(--warning)]">
          <CloudOff className="h-4 w-4 shrink-0" />
          <span>
            Offline mode — no network. Pages show the data saved on this device; new invoices are saved here and uploaded when you
            switch back to online mode.
          </span>
        </div>
      )}
      {lastSync && (
        <div
          className={clsx(
            'mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm font-semibold',
            lastSync.failed || lastSync.networkError
              ? 'border-[var(--critical)] bg-[var(--critical-soft)] text-[var(--critical)]'
              : 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]'
          )}
        >
          <span>
            {lastSync.networkError
              ? 'The network dropped again — still in offline mode. Your saved bills are safe on this device.'
              : `Back online. ${lastSync.uploaded} saved bill${lastSync.uploaded === 1 ? '' : 's'} uploaded.` +
                (lastSync.failed ? ` ${lastSync.failed} could not be uploaded — see the Offline panel.` : '')}
          </span>
          <button type="button" onClick={clearLastSync} className="text-xs underline">Dismiss</button>
        </div>
      )}
    </>
  )
}

/** Details: current mode, switch button, and the bills waiting on this device. */
function NetworkPanel({ onClose }) {
  const { mode, networkAvailable, queue, syncing, goOffline, goOnline, discardBill } = useNetwork()
  const offline = mode === 'offline'

  return (
    <Modal title="Connection" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3">
          <div>
            <p className="font-bold text-[var(--ink)]">{offline ? 'Offline mode' : 'Online'}</p>
            <p className="text-xs text-[var(--muted)]">
              {offline
                ? networkAvailable
                  ? 'The network is available — you can switch back to online mode.'
                  : 'No network. Working from this device.'
                : 'Connected to the server. Everything saves immediately.'}
            </p>
          </div>
          {offline ? (
            <Button onClick={goOnline} disabled={syncing || !networkAvailable} className="text-xs">
              <RefreshCw className={clsx('h-3.5 w-3.5', syncing && 'animate-spin')} />
              {syncing ? 'Uploading…' : 'Switch to online'}
            </Button>
          ) : (
            <Button variant="secondary" onClick={goOffline} className="text-xs">
              <WifiOff className="h-3.5 w-3.5" /> Work offline
            </Button>
          )}
        </div>

        <div>
          <p className="mb-2 font-semibold text-[var(--ink)]">
            Bills saved on this device <span className="text-[var(--muted)]">({queue.length})</span>
          </p>
          {queue.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">Nothing waiting to upload.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {queue.map((bill) => (
                <li key={bill.clientRef} className="rounded-lg border border-[var(--line)] p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--ink)]">
                      {bill.payload.is_credit ? 'Credit bill' : 'Sales invoice'} · {bill.payload.customer_name || 'Walk-in'}
                    </span>
                    <span className="font-mono font-bold text-[var(--accent)]">LKR {money(billTotal(bill.payload))}</span>
                  </div>
                  <div className="mt-0.5 text-[var(--muted)]">
                    {new Date(bill.savedAt).toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })} · {bill.payload.items?.length || 0} item(s)
                  </div>
                  {bill.error && (
                    <div className="mt-1.5 flex items-start justify-between gap-2 rounded bg-[var(--critical-soft)] p-2 text-[var(--critical)]">
                      <span>Upload failed: {bill.error}</span>
                      <button
                        type="button"
                        onClick={() => window.confirm('Discard this saved bill? It will not be uploaded.') && discardBill(bill.clientRef)}
                        className="shrink-0 font-bold underline"
                      >
                        Discard
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            Bills get their invoice number when they are uploaded; print them after switching back to online mode.
          </p>
        </div>
      </div>
    </Modal>
  )
}
