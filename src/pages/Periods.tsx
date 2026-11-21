import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, Card, Empty, ErrorText, Field, fmtDate } from '../components/ui.tsx'
import { useAsync } from '../hooks/useAsync.ts'
import { createPeriod, listPeriods } from '../lib/db.ts'

export default function Periods() {
  const { data, error, loading } = useAsync(listPeriods, [])
  const nav = useNavigate()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [label, setLabel] = useState('')
  const [err, setErr] = useState<string | null>(null)

  async function create(e: FormEvent) {
    e.preventDefault()
    try {
      const p = await createPeriod(from, to, label)
      nav(`/period/${p.id}/balances`)
    } catch (x) { setErr((x as Error).message) }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <Card title="Звітні періоди">
        {loading && <p className="text-muted">Завантаження…</p>}
        {error && <ErrorText>{error}</ErrorText>}
        {data?.length === 0 && <Empty>Періодів ще немає. Створіть перший: вкажіть дати справа.</Empty>}
        <ul className="-mx-4 -my-4 divide-y divide-line">
          {data?.map((p) => (
            <li key={p.id}>
              <Link to={`/period/${p.id}/receipts`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stripe">
                <span>
                  <span className="font-mono text-[15px] font-medium tabular-nums">{fmtDate(p.date_from)} – {fmtDate(p.date_to)}</span>
                  {p.label && <span className="ml-3 text-sm text-muted">{p.label}</span>}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === 'closed' ? 'bg-accent-soft text-accent' : 'bg-warn-soft text-warn'}`}>
                  {p.status === 'closed' ? 'закритий' : 'чернетка'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Новий період">
        <form onSubmit={create} className="flex flex-col gap-3.5">
          <Field label="З дати" type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
          <Field label="По дату" type="date" required value={to} onChange={(e) => setTo(e.target.value)} />
          <Field label="Примітка" placeholder="жовтень" value={label} onChange={(e) => setLabel(e.target.value)} />
          {err && <ErrorText>{err}</ErrorText>}
          <Button>Створити період</Button>
          <p className="text-xs text-muted">Початкові залишки підтягнуться з попереднього періоду.</p>
        </form>
      </Card>
    </div>
  )
}
