import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { AlertTriangle } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { Button, Modal } from './ui'

const MODES = [
  {
    value: 'stock',
    title: 'Reset stock to zero',
    detail: 'Every stock quantity and stock movement (including stock transfers) is cleared. Products, prices and QR labels stay.',
  },
  {
    value: 'products',
    title: 'Delete all products',
    detail:
      'Removes every product and its stock. Products already on invoices or purchases are archived instead — hidden from Inventory so old bills still open.',
  },
]

/** Admin-only, irreversible: the server also enforces the Admin role and the typed confirmation. */
export function FlushInventoryModal({ onClose }) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState('stock')
  const [confirm, setConfirm] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const flushMutation = useMutation({
    mutationFn: () => api.post('/products/flush', { mode, confirm }).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] })
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not flush the inventory.')),
  })

  if (result) {
    return (
      <Modal title="Inventory flushed" onClose={onClose}>
        <p className="text-sm font-semibold text-[var(--success)]">{result.message}</p>
        <ul className="mt-3 space-y-1 text-xs text-[var(--muted)]">
          <li>Stock entries cleared: <strong className="text-[var(--ink)]">{result.stock_entries_cleared}</strong></li>
          <li>Stock transfers cleared: <strong className="text-[var(--ink)]">{result.transfers_cleared}</strong></li>
          {result.products_deleted !== undefined && (
            <>
              <li>Products deleted: <strong className="text-[var(--ink)]">{result.products_deleted}</strong></li>
              <li>Products archived (used on bills): <strong className="text-[var(--ink)]">{result.products_archived}</strong></li>
            </>
          )}
        </ul>
        <div className="mt-5 flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Flush inventory" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError('')
          flushMutation.mutate()
        }}
        className="space-y-4"
      >
        <div className="flex items-start gap-2 rounded-lg bg-[var(--critical-soft)] p-3 text-xs text-[var(--critical)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This cannot be undone. Export the inventory to CSV first if you may need it again.</span>
        </div>

        <div className="space-y-2">
          {MODES.map((m) => (
            <label
              key={m.value}
              className={clsx(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition',
                mode === m.value ? 'border-[var(--critical)] bg-[var(--critical-soft)]/40' : 'border-[var(--line)] hover:bg-[var(--paper)]'
              )}
            >
              <input
                type="radio"
                name="flush-mode"
                value={m.value}
                checked={mode === m.value}
                onChange={() => setMode(m.value)}
                className="mt-1 accent-[var(--critical)]"
              />
              <span>
                <span className="block text-sm font-bold text-[var(--ink)]">{m.title}</span>
                <span className="block text-xs text-[var(--muted)]">{m.detail}</span>
              </span>
            </label>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-[var(--ink)]">
            Type <strong className="font-mono">FLUSH</strong> to confirm
          </span>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2 font-mono text-sm text-[var(--ink)] outline-none focus:border-[var(--critical)]"
          />
        </label>

        {error && <p className="text-xs font-semibold text-[var(--critical)]">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-[var(--line)] pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" disabled={confirm !== 'FLUSH' || flushMutation.isPending}>
            {flushMutation.isPending ? 'Flushing…' : mode === 'products' ? 'Delete all products' : 'Reset all stock'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
