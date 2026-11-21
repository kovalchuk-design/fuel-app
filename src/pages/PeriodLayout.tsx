import { NavLink, Outlet, useParams } from 'react-router'
import { fmtDate } from '../components/ui.tsx'
import { useAsync } from '../hooks/useAsync.ts'
import { getPeriod } from '../lib/db.ts'

const tabs = [['balances', 'Залишки на початок'], ['receipts', 'Надходження'], ['waybills', 'Шляхові листи'], ['reconcile', 'Звірка']]

export default function PeriodLayout() {
  const { id = '' } = useParams()
  const { data, error } = useAsync(() => getPeriod(id), [id])
  if (error) return <p className="text-red-700">{error}</p>
  if (!data) return <p className="text-slate-500">Завантаження…</p>
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Період {fmtDate(data.date_from)} – {fmtDate(data.date_to)} {data.label && <span className="font-normal text-slate-500">({data.label})</span>}</h1>
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${isActive ? 'border-sky-700 text-sky-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</NavLink>
        ))}
      </div>
      <Outlet context={{ period: data }} />
    </div>
  )
}
