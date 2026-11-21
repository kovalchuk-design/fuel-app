import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'

export const inputCls =
  'h-9 rounded-md border border-line bg-surface px-2.5 text-sm text-ink placeholder:text-muted/60 focus-visible:border-accent'

export function Button({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'destructive' }) {
  const v = {
    primary: 'bg-accent text-white hover:bg-accent-strong',
    ghost: 'border border-line bg-surface text-ink hover:bg-stripe',
    danger: 'text-danger hover:bg-danger-soft',
    destructive: 'bg-danger text-white hover:bg-danger/90',
  }[variant]
  return <button {...p} className={`h-9 rounded-md px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${v} ${className}`} />
}

export function Field({ label, hint, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      <input {...p} className={`${inputCls} font-normal ${p.className ?? ''}`} />
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  )
}

export const Card = ({ title, aside, children }: { title?: string; aside?: ReactNode; children: ReactNode }) => (
  <section className="overflow-hidden rounded-lg border border-line bg-surface">
    {title && (
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-[15px] font-bold">{title}</h2>
        {aside}
      </header>
    )}
    <div className="p-4">{children}</div>
  </section>
)

export const ErrorText = ({ children }: { children: ReactNode }) => (
  <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{children}</p>
)

export const Empty = ({ children }: { children: ReactNode }) => <p className="py-6 text-center text-sm text-muted">{children}</p>

/** Класи таблиць «журналу»: цифри моноширинні з табличними знаками, ліворуч текст, праворуч числа. */
export const tbl = 'w-full min-w-[40rem] border-collapse text-sm'
export const th = 'border-b border-line bg-surface px-2.5 py-2 text-left text-xs font-semibold text-muted'
export const thR = `${th} text-right`
export const td = 'px-2.5 py-1.5'
export const num = 'px-2.5 py-1.5 text-right font-mono tabular-nums'
export const Scroll = ({ children }: { children: ReactNode }) => <div className="-mx-4 overflow-x-auto px-4">{children}</div>

export const fmt = (n: number | null | undefined) => (n == null ? '–' : new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(n))
export const fmtDate = (iso: string) => iso.split('-').reverse().join('.')

/** Хрестик видалення: з'являється при наведенні на рядок (рядок має клас `group`), на дотикових екранах видно завжди. */
export function DeleteX({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button" aria-label={label} title={label} onClick={onClick}
      className="grid size-8 place-items-center rounded-md text-muted opacity-0 transition-opacity hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
    >
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
      </svg>
    </button>
  )
}

/** Модальне підтвердження небезпечної дії (замість браузерного confirm). Esc або клік поза вікном скасовують. */
export function ConfirmDialog({ title, message, confirmLabel = 'Видалити', onConfirm, onCancel }: {
  title: string; message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-ink/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-msg" className="w-full max-w-md rounded-lg border border-line bg-surface p-5">
        <h2 id="confirm-title" className="text-lg font-bold">{title}</h2>
        <p id="confirm-msg" className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" autoFocus onClick={onCancel}>Скасувати</Button>
          <Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
