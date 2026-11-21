import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export const inputCls =
  'h-9 rounded-md border border-line bg-surface px-2.5 text-sm text-ink placeholder:text-muted/60 focus-visible:border-accent'

export function Button({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const v = {
    primary: 'bg-accent text-white hover:bg-accent-strong',
    ghost: 'border border-line bg-surface text-ink hover:bg-stripe',
    danger: 'text-danger hover:bg-danger-soft',
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
