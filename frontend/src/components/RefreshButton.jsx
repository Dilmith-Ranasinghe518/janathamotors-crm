import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import clsx from 'clsx'

/**
 * Header button that reloads the data on the current page (and everything else on screen).
 * It refreshes data only, so anything typed into a form is kept. In offline mode the data comes
 * from the copy saved on this device.
 */
export function RefreshButton() {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    if (busy) return
    setBusy(true)
    try {
      await Promise.all([
        queryClient.invalidateQueries(),
        new Promise((r) => setTimeout(r, 500)), // keep the spin visible long enough to notice
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={busy}
      title="Refresh data"
      aria-label="Refresh data"
      className="flex items-center rounded-full border border-[var(--line)] bg-[var(--surface)] p-2 text-[var(--ink)] transition hover:bg-[var(--paper)] disabled:opacity-70"
    >
      <RefreshCw className={clsx('h-3.5 w-3.5', busy && 'animate-spin')} />
    </button>
  )
}
