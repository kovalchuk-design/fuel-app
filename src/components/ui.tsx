import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export const inputCls = 'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500'

export function Button({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const v = { primary: 'bg-sky-700 text-white hover:bg-sky-800', ghost: 'border border-slate-300 bg-white hover:bg-slate-100', danger: 'text-red-700 hover:bg-red-50' }[variant]
  return <button {...p} className={`rounded-md px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`} />
}

export function Field({ label, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
      {label}
      <input {...p} className={`${inputCls} font-normal text-slate-900 ${p.className ?? ''}`} />
    </label>
  )
}

export const Card = ({ title, children }: { title?: string; children: ReactNode }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    {title && <h2 className="mb-3 text-base font-bold">{title}</h2>}
    {children}
  </section>
)

export const ErrorText = ({ children }: { children: ReactNode }) => <p className="text-sm text-red-700">{children}</p>

export const fmt = (n: number | null | undefined) => (n == null ? '–' : new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(n))
export const fmtDate = (iso: string) => iso.split('-').reverse().join('.')
