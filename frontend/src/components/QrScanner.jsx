import { useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CameraOff, ScanLine } from 'lucide-react'
import { Button } from './ui'

/**
 * Scan input for QR codes: works with USB/Bluetooth scanners (they type the code + Enter)
 * and with the device camera. Calls onScan(code) for every scan.
 */
export function QrScanBar({ onScan, message, startWithCamera = false }) {
  const [code, setCode] = useState('')
  const [cameraOn, setCameraOn] = useState(startWithCamera)

  function submitCode(e) {
    e.preventDefault()
    const value = code.trim()
    if (value) onScan(value)
    setCode('')
  }

  return (
    <div className="rounded-xl border border-dashed border-[var(--accent)] bg-[var(--accent-soft)]/40 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--accent)]" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitCode(e)}
            placeholder="Scan QR with scanner, or type Item No and press Enter…"
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <Button type="button" variant="secondary" onClick={() => setCameraOn((v) => !v)} className="flex items-center gap-1.5">
          {cameraOn ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          <span>{cameraOn ? 'Stop camera' : 'Camera'}</span>
        </Button>
      </div>
      {cameraOn && <CameraScanner onScan={onScan} />}
      {message && (
        <p className={`text-xs font-semibold ${message.ok ? 'text-[var(--success)]' : 'text-[var(--critical)]'}`}>{message.text}</p>
      )}
    </div>
  )
}

function CameraScanner({ onScan }) {
  const elementId = `qr-camera-${useId().replace(/:/g, '')}`
  const onScanRef = useRef(onScan)
  const [error, setError] = useState('')

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    const scanner = new Html5Qrcode(elementId)
    let last = { code: '', at: 0 }
    let started = false

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (decoded) => {
          // The camera reports the same code many times a second; count it once per 2s.
          const now = Date.now()
          if (decoded === last.code && now - last.at < 2000) return
          last = { code: decoded, at: now }
          onScanRef.current(decoded)
        },
        () => {}
      )
      .then(() => {
        started = true
      })
      .catch(() => setError('Could not open the camera. Allow camera access (the site must use HTTPS).'))

    return () => {
      if (started) scanner.stop().then(() => scanner.clear()).catch(() => {})
    }
  }, [elementId])

  return (
    <div>
      <div id={elementId} className="mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-black" />
      {error && <p className="mt-1 text-xs font-semibold text-[var(--critical)]">{error}</p>}
    </div>
  )
}
