import { NavLink, Outlet, useLocation, useParams } from 'react-router'
import { fmtDate } from '../components/ui.tsx'
import { useAsync } from '../hooks/useAsync.ts'
import { getPeriod, listReceipts, listWaybills } from '../lib/db.ts'

export default function PeriodLayout() {
  const { id = '' } = useParams()
  const { pathname } = useLocation()
  const { data, error } = useAsync(() => getPeriod(id), [id])
  // Лічильники оновлюються при переході між кроками.
  const { data: counts } = useAsync(async () => ({ r: (await listReceipts(id)).length, w: (await listWaybills(id)).length }), [id, pathname])
  if (error) return <p className="text-danger">{error}</p>
  if (!data) return <p className="text-muted">Завантаження…</p>

  const steps: [string, string, number | null][] = [
    ['balances', 'Залишки на початок', null],
    ['receipts', 'Надходження', counts?.r ?? null],
    ['waybills', 'Шляхові листи', counts?.w ?? null],
    ['reconcile', 'Звірка і документи', null],
  ]
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-mono text-xl font-medium tabular-nums">{fmtDate(data.date_from)} – {fmtDate(data.date_to)}</h1>
        {data.label && <p className="text-sm text-muted">{data.label}</p>}
      </div>
      <nav aria-label="Кроки періоду" className="flex gap-1 overflow-x-auto border-b border-line">
        {steps.map(([to, label, count], i) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            {({ isActive }) => (
              <>
                <span className={`grid size-5 place-items-center rounded-full text-xs ${isActive ? 'bg-accent text-white' : 'bg-stripe text-muted'}`}>{i + 1}</span>
                {label}
                {count != null && count > 0 && <span className="rounded-full bg-accent-soft px-1.5 font-mono text-xs text-accent">{count}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <Outlet context={{ period: data }} />
    </div>
  )
}
