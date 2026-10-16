import { useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Printer } from 'lucide-react'
import { Button, Modal } from './ui'

/**
 * The QR payload is the Item No, so a scanner "types" it straight into any product search box.
 */
export function ProductQrThumb({ product, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="View / print QR label"
      className="rounded-md border border-[var(--line)] bg-white p-1 transition hover:border-[var(--accent)] hover:shadow-sm"
    >
      <QRCodeSVG value={product.item_no} size={40} level="M" />
    </button>
  )
}

export function ProductQrModal({ product, onClose }) {
  const svgWrapRef = useRef(null)

  function svgMarkup() {
    return svgWrapRef.current?.querySelector('svg')?.outerHTML ?? ''
  }

  function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
  }

  function handlePrint() {
    const win = window.open('', '_blank', 'width=400,height=500')
    if (!win) return
    win.document.write(`<!doctype html><html><head><title>${escapeHtml(product.item_no)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 16px; text-align: center; }
        .label { display: inline-block; border: 1px dashed #999; padding: 12px; }
        .no { font-family: monospace; font-weight: bold; font-size: 14px; margin-top: 6px; }
        .meta { font-size: 11px; color: #333; margin-top: 2px; max-width: 200px; }
        @media print { .label { border: none; } }
      </style></head><body>
      <div class="label">
        ${svgMarkup()}
        <div class="no">${escapeHtml(product.item_no)}</div>
        ${product.part_no ? `<div class="meta">Part No: ${escapeHtml(product.part_no)}</div>` : ''}
        <div class="meta">${escapeHtml(product.name)}</div>
      </div>
      <script>window.onload = () => { window.print(); window.close(); }</script>
      </body></html>`)
    win.document.close()
  }

  function handleDownload() {
    const blob = new Blob([svgMarkup()], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${product.item_no}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Modal title="Part QR code" onClose={onClose}>
      <div className="flex flex-col items-center gap-3">
        <div ref={svgWrapRef} className="rounded-xl border border-[var(--line)] bg-white p-4">
          <QRCodeSVG value={product.item_no} size={200} level="M" marginSize={1} />
        </div>
        <div className="text-center">
          <div className="font-mono text-sm font-bold text-[var(--ink)]">{product.item_no}</div>
          {product.part_no && <div className="text-xs text-[var(--muted)]">Part No: {product.part_no}</div>}
          {product.item_code && <div className="text-xs text-[var(--muted)]">Item Code: {product.item_code}</div>}
          <div className="mt-1 text-sm text-[var(--ink)]">{product.name}</div>
        </div>
        <div className="flex w-full justify-end gap-2 border-t border-[var(--line)] pt-3">
          <Button type="button" variant="secondary" onClick={handleDownload}>
            <Download className="h-4 w-4" /> Download
          </Button>
          <Button type="button" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print label
          </Button>
        </div>
      </div>
    </Modal>
  )
}

const SHEET_COLS = 7
const SHEET_ROWS = 9

function escapeSheetHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

/**
 * Opens a print-ready A4 sheet packing SHEET_COLS × SHEET_ROWS QR labels per page
 * (Item No + store / shelf location). Use the browser's "Save as PDF" to export.
 * `win` must be opened synchronously in the click handler, or pop-up blockers stop it.
 */
export function printQrSheet(products, win) {
  const perPage = SHEET_COLS * SHEET_ROWS
  const pages = []
  for (let i = 0; i < products.length; i += perPage) pages.push(products.slice(i, i + perPage))

  const pagesHtml = pages
    .map(
      (page) => `<section class="page">${page
        .map((p) => {
          const svg = renderToStaticMarkup(<QRCodeSVG value={p.item_no} size={256} level="M" marginSize={0} />)
          const location = [p.store?.code, p.shelf_location].filter(Boolean).join(' · ')
          return `<div class="cell">${svg}<div class="no">${escapeSheetHtml(p.item_no)}</div><div class="loc">${escapeSheetHtml(location || '—')}</div></div>`
        })
        .join('')}</section>`
    )
    .join('')

  win.document.open()
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR Labels (${products.length})</title>
    <style>
      @page { size: A4; margin: 6mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, sans-serif; }
      .page { display: grid; grid-template-columns: repeat(${SHEET_COLS}, 1fr); grid-auto-rows: ${Math.floor(2850 / SHEET_ROWS) / 10}mm;
              width: 198mm; break-after: page; page-break-after: always; }
      .page:last-child { break-after: auto; page-break-after: auto; }
      .cell { border: 0.2mm dashed #bbb; padding: 1.2mm; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
      .cell svg { width: 21mm; height: 21mm; }
      .no { font-family: monospace; font-weight: bold; font-size: 7pt; margin-top: 0.8mm; text-align: center; word-break: break-all; line-height: 1.1; }
      .loc { font-size: 6pt; color: #333; text-align: center; line-height: 1.1; word-break: break-word; }
      @media screen { body { background: #eee; } .page { background: #fff; margin: 8mm auto; padding: 6mm; width: 210mm; box-shadow: 0 1px 4px rgba(0,0,0,.2); } }
    </style></head><body>${pagesHtml}
    <script>window.onload = () => window.print()</script>
    </body></html>`)
  win.document.close()
}
