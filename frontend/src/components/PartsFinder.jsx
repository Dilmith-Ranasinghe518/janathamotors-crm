import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Car, MapPin, Package, ScanLine, Search, Tag } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { codeFromQr } from '../lib/qr'
import { QrScanBar } from './QrScanner'
import { Button, Modal } from './ui'

const money = (v) => `Rs. ${Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Find the product for a scanned QR / typed code: exact Item Code first, then Item No / Part No, then a name search. */
async function lookup(raw) {
  const code = String(codeFromQr(raw)).trim()
  const { data } = await api.get('/products', { params: { search: code, per_page: 20 } })
  const list = data.data ?? []
  const needle = code.toLowerCase()
  const exact =
    list.find((p) => p.item_code?.toLowerCase() === needle) ||
    list.find((p) => String(p.item_no).toLowerCase() === needle || p.part_no?.toLowerCase() === needle)
  return { code, exact, matches: exact ? [] : list }
}

/** Dashboard button: scan a part's QR (camera or scanner) and see its details. */
export function PartsFinderButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
        <ScanLine className="h-4 w-4" />
        <span>Find Parts</span>
      </Button>
      {open && <PartsFinder onClose={() => setOpen(false)} />}
    </>
  )
}

function PartsFinder({ onClose }) {
  const [product, setProduct] = useState(null)
  const [matches, setMatches] = useState([])
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleScan(raw) {
    if (busy) return
    setBusy(true)
    setMessage({ ok: true, text: 'Looking up…' })
    try {
      const { code, exact, matches } = await lookup(raw)
      if (exact) {
        setProduct(exact)
        setMatches([])
        setMessage(null)
      } else if (matches.length) {
        setProduct(null)
        setMatches(matches)
        setMessage({ ok: true, text: `No exact code "${code}". ${matches.length} similar part${matches.length === 1 ? '' : 's'}:` })
      } else {
        setProduct(null)
        setMatches([])
        setMessage({ ok: false, text: `No part found for "${code}".` })
      }
    } catch (error) {
      setMessage({ ok: false, text: apiErrorMessage(error, 'Could not look up the part.') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Parts Finder" onClose={onClose} wide>
      {product ? (
        <div className="space-y-4">
          <PartDetails product={product} />
          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--line)] pt-3">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button onClick={() => setProduct(null)} className="flex items-center gap-2">
              <ScanLine className="h-4 w-4" />
              <span>Scan another part</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Point the camera at a part's QR label, use a QR scanner, or type an Item Code / Part No and press Enter.
          </p>
          <QrScanBar onScan={handleScan} message={message} startWithCamera />
          {matches.length > 0 && (
            <ul className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setProduct(p)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-[var(--paper)]"
                  >
                    <span>
                      <span className="font-mono font-bold">{p.item_code || '—'}</span>
                      <span className="ml-2 text-[var(--ink)]">{p.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-[var(--muted)]">Stock {p.stock_on_hand ?? 0}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  )
}

function Row({ label, children }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[var(--ink)] break-words">{children || '—'}</dd>
    </div>
  )
}

function PartDetails({ product: p }) {
  const stock = Number(p.stock_on_hand ?? 0)
  const low = stock <= Number(p.reorder_level ?? 0)
  const vehicle = [p.vehicle_brand?.name, p.vehicle_model?.name].filter(Boolean).join(' ')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-[var(--accent)]">Item Code {p.item_code || '—'}</p>
          <h3 className="mt-1 text-lg font-bold leading-snug text-[var(--ink)]">{p.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
            {p.category?.name && <span className="rounded border border-[var(--line)] px-1.5 py-0.5">{p.category.name}</span>}
            {p.brand?.name && <span className="text-[var(--muted)]">Brand: {p.brand.name}</span>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Selling price</p>
          <p className="text-xl font-bold tabular-nums text-[var(--ink)]">{money(p.selling_price)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className={`rounded-xl border p-3 ${low ? 'border-[var(--critical)] bg-[var(--critical-soft)]' : 'border-[var(--success)] bg-[var(--success-soft)]'}`}>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            <Package className="h-3.5 w-3.5" /> In stock
          </p>
          <p className={`text-2xl font-bold tabular-nums ${low ? 'text-[var(--critical)]' : 'text-[var(--success)]'}`}>
            {stock} <span className="text-sm font-semibold">{p.unit || 'pc'}</span>
          </p>
          {low && <p className="text-xs font-semibold text-[var(--critical)]">Low stock (reorder at {p.reorder_level})</p>}
        </div>
        <div className="rounded-xl border border-[var(--line)] p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            <MapPin className="h-3.5 w-3.5" /> Location
          </p>
          <p className="text-lg font-bold text-[var(--ink)]">{p.store?.code || '—'}</p>
          <p className="text-xs text-[var(--muted)]">{p.shelf_location ? `Rack / shelf: ${p.shelf_location}` : 'No rack / shelf set'}</p>
        </div>
        <div className="rounded-xl border border-[var(--line)] p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            <Car className="h-3.5 w-3.5" /> Vehicle
          </p>
          <p className="text-sm font-semibold text-[var(--ink)]">{vehicle || '—'}</p>
          {p.compatible_models && <p className="text-xs text-[var(--muted)]">{p.compatible_models}</p>}
        </div>
      </div>

      {p.store_stock?.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Stock by store</p>
          <div className="flex flex-wrap gap-2">
            {p.store_stock.map((s) => (
              <span key={s.store_id} title={s.name} className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs">
                <b>{s.code}</b>: {s.quantity}
              </span>
            ))}
          </div>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Row label="Part No"><span className="font-mono text-xs">{p.part_no}</span></Row>
        <Row label="Unit">{p.unit}</Row>
        <Row label="Reorder level">{p.reorder_level}</Row>
        <Row label="Status">{p.is_active === false ? 'Inactive' : 'Active'}</Row>
      </dl>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link to={`/products?search=${encodeURIComponent(p.item_code || p.name)}`} className="flex items-center gap-1.5 font-semibold text-[var(--accent)] hover:underline">
          <Tag className="h-4 w-4" /> Open in Inventory
        </Link>
        <Link to="/invoices/new" className="flex items-center gap-1.5 font-semibold text-[var(--accent)] hover:underline">
          <Search className="h-4 w-4" /> New sales invoice
        </Link>
      </div>
    </div>
  )
}
