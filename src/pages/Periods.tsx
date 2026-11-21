import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, Card, ErrorText, Field, fmtDate } from '../components/ui.tsx'
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
    <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
      <Card title="Звітні періоди">
        {loading && <p className="text-slate-500">Завантаження…</p>}
        {error && <ErrorText>{error}</ErrorText>}
        {data?.length === 0 && <p className="text-slate-500">Періодів ще немає. Створіть перший справа.</p>}
        <ul className="divide-y divide-slate-100">
          {data?.map((p) => (
            <li key={p.id}>
              <Link to={`/period/${p.id}/receipts`} className="flex justify-between py-2 hover:text-sky-700">
                <span className="font-semibold">{fmtDate(p.date_from)} – {fmtDate(p.date_to)} {p.label && <span className="font-normal text-slate-500">({p.label})</span>}</span>
                <span className="text-xs text-slate-500">{p.status === 'closed' ? 'закритий' : 'чернетка'}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Новий період">
        <form onSubmit={create} className="flex flex-col gap-3">
          <Field label="З дати" type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
          <Field label="По дату" type="date" required value={to} onChange={(e) => setTo(e.target.value)} />
          <Field label="Примітка (напр. «жовтень»)" value={label} onChange={(e) => setLabel(e.target.value)} />
          {err && <ErrorText>{err}</ErrorText>}
          <Button>Створити</Button>
          <p className="text-xs text-slate-500">Початкові залишки підтягнуться із попереднього періоду.</p>
        </form>
      </Card>
    </div>
  )
}
