import clsx from 'clsx'
import calcifyLogo from '../assets/calcify-logo.png'

const CALCIFY_URL = 'https://calcify-int.vercel.app/'

/** "Software by Calcify Int" credit. `compact` shows only the logo (collapsed sidebar). */
export function SoftwareCredit({ compact = false, className }) {
  return (
    <a
      href={CALCIFY_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Software by Calcify Int"
      className={clsx(
        'group inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)] transition hover:text-[var(--ink)]',
        className
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-black">
        <img src={calcifyLogo} alt="Calcify Int" className="h-3.5 w-3.5 object-contain" />
      </span>
      {!compact && (
        <span>
          Software by <span className="font-semibold group-hover:underline">Calcify Int</span>
        </span>
      )}
    </a>
  )
}
