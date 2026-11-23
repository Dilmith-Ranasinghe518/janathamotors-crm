import { useEffect, useState } from 'react'
import { Download, Share, SquarePlus } from 'lucide-react'
import { canPromptInstall, isIos, isStandalone, promptInstall, subscribeInstall } from '../lib/install'
import { Modal } from './ui'

/** Header button that installs the CRM as an app. Hidden once it is installed. */
export function InstallAppButton() {
  const [, rerender] = useState(0)
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => subscribeInstall(() => rerender((n) => n + 1)), [])

  if (isStandalone()) return null
  const ios = isIos()
  if (!canPromptInstall() && !ios) return null

  return (
    <>
      <button
        type="button"
        onClick={() => (ios ? setShowIosHelp(true) : promptInstall())}
        title="Install this app on this device"
        className="flex items-center gap-1.5 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--accent)] hover:opacity-90"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Install app</span>
      </button>
      {showIosHelp && (
        <Modal title="Install on iPhone / iPad" onClose={() => setShowIosHelp(false)}>
          <ol className="space-y-3 text-sm text-[var(--ink)]">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>
                Open this page in <b>Safari</b> and tap the <b>Share</b> button{' '}
                <Share className="inline h-4 w-4 align-text-bottom" />.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>
                Choose <b>Add to Home Screen</b> <SquarePlus className="inline h-4 w-4 align-text-bottom" />, then tap <b>Add</b>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Open <b>Janatha Motors</b> from your home screen. It runs full screen like an app.</span>
            </li>
          </ol>
        </Modal>
      )}
    </>
  )
}
