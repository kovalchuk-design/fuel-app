import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { useRefs } from '../auth/Refs.tsx'
import { Button, Card, ErrorText, Field, fmt, inputCls } from '../components/ui.tsx'
import { useAsync } from '../hooks/useAsync.ts'
import { deleteRow, insertRow, listReceipts } from '../lib/db.ts'

export default function Receipts() {
  const { id = '' } = useParams()
  const { fuels } = useRefs()
  const { data, error, reload } = useAsync(() => listReceipts(id), [id])
  const [fuel, setFuel] = useState('')
  const [liters, setLiters] = useState('')
  const [kg, setKg] = useState('')
  const [doc, setDoc] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const name = (fid: string) => fuels.find((f) => f.id === fid)?.name ?? fid

  async function add(e: FormEvent) {
    e.preventDefault()
    try {
      await insertRow('supplier_receipts', { period_id: id, fuel_type_id: fuel, liters: Number(liters), kg: kg ? Number(kg) : null, doc_ref: doc || null })
      setLiters(''); setKg(''); setDoc(''); setErr(null); await reload()
    } catch (x) { setErr((x as Error).message) }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
      <Card title="Надходження від постачальника">
        {error && <ErrorText>{error}</ErrorText>}
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500"><tr><th>Пальне</th><th className="text-right">Літри</th><th className="text-right">кг</th><th>Документ</th><th /></tr></thead>
          <tbody>
            {data?.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="py-1.5">{name(r.fuel_type_id)}</td>
                <td className="text-right font-mono">{fmt(r.liters)}</td>
                <td className="text-right font-mono text-slate-500">{fmt(r.kg)}</td>
                <td>{r.doc_ref}</td>
                <td className="text-right"><Button variant="danger" onClick={async () => { await deleteRow('supplier_receipts', r.id); await reload() }}>✕</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Додати надходження">
        <form onSubmit={add} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">Вид пального
            <select required className={inputCls} value={fuel} onChange={(e) => setFuel(e.target.value)}>
              <option value="">— оберіть —</option>
              {fuels.filter((f) => f.kind === 'fuel').map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <Field label="Літри" type="number" step="0.01" min="0" required value={liters} onChange={(e) => setLiters(e.target.value)} />
          <Field label="кг (лише для відображення)" type="number" step="0.01" min="0" value={kg} onChange={(e) => setKg(e.target.value)} />
          <Field label="№ роздавальної відомості" value={doc} onChange={(e) => setDoc(e.target.value)} />
          {err && <ErrorText>{err}</ErrorText>}
          <Button>Додати</Button>
        </form>
      </Card>
    </div>
  )
}
