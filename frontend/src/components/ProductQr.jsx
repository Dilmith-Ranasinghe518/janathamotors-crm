import { useRef } from 'react'
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
