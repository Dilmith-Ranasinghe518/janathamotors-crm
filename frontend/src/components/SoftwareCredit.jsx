import clsx from 'clsx'
import calcifyLogo from '../assets/calcify-logo.png'

const CALCIFY_URL = 'https://calcify-int.vercel.app/'
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
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-black"
      >
        <img src={calcifyLogo} alt="Calcify Int" className="h-3.5 w-3.5 object-contain" />
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
