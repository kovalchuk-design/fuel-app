import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, Card, ConfirmDialog, DeleteX, Empty, ErrorText, Field, fmtDate, inputCls } from '../components/ui.tsx'
import { useAsync } from '../hooks/useAsync.ts'
import { createPeriod, deletePeriod, listPeriods } from '../lib/db.ts'
import { defaultRange, isMonthDisabled, MONTHS, monthName, skippedMonths } from '../lib/months.ts'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function Periods() {
  const { data, error, loading, reload } = useAsync(listPeriods, [])
  const nav = useNavigate()
  const latest = useMemo(() => (data?.length ? { year: data[0].report_year, month: data[0].report_month } : null), [data])
  const years = useMemo(() => { const y = latest?.year ?? 2026; return [y, y + 1] }, [latest])

  const [year, setYear] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [delErr, setDelErr] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; title: string } | null>(null)

  // Після завантаження пропонуємо найближчий ще не зроблений місяць.
  useEffect(() => {
    if (!data) return
    const y = latest?.year ?? 2026
    const next = latest ? (latest.month === 12 ? { year: y + 1, month: 1 } : { year: y, month: latest.month + 1 }) : { year: y, month: 1 }
    setYear(next.year); setMonth(next.month)
  }, [data, latest])

  useEffect(() => {
    if (year == null || month == null) return
    const r = defaultRange(year, month)
    setFrom(r.from); setTo(r.to)
  }, [year, month])

  const skipped = year != null && month != null ? skippedMonths(year, month, latest) : 0

  async function create(e: FormEvent) {
    e.preventDefault()
    if (year == null || month == null) return
    try {
      const p = await createPeriod(year, month, from, to)
      nav(`/period/${p.id}/balances`)
    } catch (x) { setErr((x as Error).message) }
  }

  async function remove() {
    if (!pending) return
    try { await deletePeriod(pending.id); setDelErr(null); await reload() } catch (x) { setDelErr((x as Error).message) }
    setPending(null)
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <Card title="Звіти за місяцями">
        {loading && <p className="text-muted">Завантаження…</p>}
        {error && <ErrorText>{error}</ErrorText>}
        {delErr && <ErrorText>{delErr}</ErrorText>}
        {data?.length === 0 && <Empty>Звітів ще немає. Оберіть місяць справа й створіть перший.</Empty>}
        <ul className="-mx-4 -my-4 divide-y divide-line">
          {data?.map((p) => (
            <li key={p.id} className="group flex items-center hover:bg-stripe">
              <Link to={`/period/${p.id}/receipts`} className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3">
                <span>
                  <span className="text-[15px] font-bold">{cap(monthName(p.report_month))} {p.report_year}</span>
                  <span className="ml-3 font-mono text-sm tabular-nums text-muted">{fmtDate(p.date_from)} – {fmtDate(p.date_to)}</span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === 'closed' ? 'bg-accent-soft text-accent' : 'bg-warn-soft text-warn'}`}>
                  {p.status === 'closed' ? 'закритий' : 'чернетка'}
                </span>
              </Link>
              {p.status === 'draft' && (
                <span className="mr-3">
                  <DeleteX label={`Видалити звіт за ${monthName(p.report_month)} ${p.report_year}`}
                    onClick={() => setPending({ id: p.id, title: `${monthName(p.report_month)} ${p.report_year}` })} />
                </span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Новий звіт">
        <form onSubmit={create} className="flex flex-col gap-3.5">
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <label className="flex flex-col gap-1 text-sm font-semibold">Місяць
              <select className={`${inputCls} font-normal`} value={month ?? ''} onChange={(e) => setMonth(Number(e.target.value))} required>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1} disabled={year != null && isMonthDisabled(year, i + 1, latest)}>{cap(m)}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">Рік
              <select className={`${inputCls} font-normal`} value={year ?? ''} onChange={(e) => setYear(Number(e.target.value))} required>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          </div>
          {skipped > 0 && (
            <p className="rounded-md bg-warn-soft px-3 py-2 text-xs text-warn">
              Між останнім звітом і вибраним місяцем пропущено місяців: {skipped}. Початкові залишки візьмуться з останнього наявного звіту.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Період з" type="date" min="2000-01-01" max="2100-12-31" required value={from} onChange={(e) => setFrom(e.target.value)} />
            <Field label="по" type="date" min="2000-01-01" max="2100-12-31" required value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <p className="-mt-2 text-xs text-muted">Зазвичай з 25-го по 25-те; за потреби дати можна змінити.</p>
          {err && <ErrorText>{err.includes('periods_report_unique') ? 'Звіт за цей місяць уже існує.' : err}</ErrorText>}
          <Button disabled={month == null || year == null || (year != null && month != null && isMonthDisabled(year, month, latest))}>Створити звіт</Button>
          <p className="text-xs text-muted">Залишки пального й спідометр перенесуться з попереднього звіту.</p>
        </form>
      </Card>

      {pending && (
        <ConfirmDialog
          title={`Видалити звіт за ${pending.title}?`}
          message="Разом із ним видаляться надходження, шляхові листи та залишки цього звіту. Дію не можна скасувати."
          onConfirm={() => void remove()} onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
