import clsx from 'clsx'
import calcifyLogo from '../assets/calcify-logo.png'

const CALCIFY_URL = 'https://calcifyint.com'
const CALCIFY_PHONE = '+94 70 160 0215'

/**
 * "Software by Calcify Int" credit with its contact number.
 * `compact` shows only the logo (collapsed sidebar); the tooltip carries the details.
 */
export function SoftwareCredit({ compact = false, className }) {
  return (
    <div className={clsx('inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]', className)}>
      <a
        href={CALCIFY_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={`Software by Calcify Int · ${CALCIFY_PHONE}`}
        className="h-6 w-6 shrink-0 overflow-hidden rounded-md shadow-xs"
      >
        {/* calcifyint.com favicon */}
        <img src={calcifyLogo} alt="Calcify Int" className="h-full w-full object-cover" />
      </a>
      {!compact && (
        <span className="leading-tight">
          Software by{' '}
          <a
            href={CALCIFY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold transition hover:text-[var(--ink)] hover:underline"
          >
            Calcify Int
          </a>
          <a
            href={`tel:${CALCIFY_PHONE.replace(/\s/g, '')}`}
            className="block font-mono transition hover:text-[var(--ink)] hover:underline"
          >
            {CALCIFY_PHONE}
          </a>
        </span>
      )}
    </div>
  )
}
