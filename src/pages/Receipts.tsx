import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { useRefs } from '../auth/Refs.tsx'
import { Button, Card, DeleteX, Empty, ErrorText, Field, fmt, inputCls, num, Scroll, tbl, td, th, thR } from '../components/ui.tsx'
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
  const totalL = (data ?? []).reduce((a, r) => a + r.liters, 0)

  async function add(e: FormEvent) {
    e.preventDefault()
    try {
      await insertRow('supplier_receipts', { period_id: id, fuel_type_id: fuel, liters: Number(liters), kg: kg ? Number(kg) : null, doc_ref: doc || null })
      setLiters(''); setKg(''); setDoc(''); setErr(null); await reload()
    } catch (x) { setErr((x as Error).message) }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <Card title="Надходження від постачальника">
        {error && <ErrorText>{error}</ErrorText>}
        {data?.length === 0 ? <Empty>Надходжень ще немає. Додайте перше справа.</Empty> : (
          <Scroll>
            <table className={tbl}>
              <thead><tr><th className={th}>Пальне</th><th className={thR}>Літри</th><th className={thR}>кг</th><th className={th}>Документ</th><th className={th} /></tr></thead>
              <tbody>
                {data?.map((r) => (
                  <tr key={r.id} className="group border-t border-line hover:bg-stripe">
                    <td className={`${td} font-semibold`}>{name(r.fuel_type_id)}</td>
                    <td className={num}>{fmt(r.liters)}</td>
                    <td className={`${num} text-muted`}>{fmt(r.kg)}</td>
                    <td className={td}>{r.doc_ref}</td>
                    <td className="px-2 text-right"><DeleteX label="Видалити надходження" onClick={async () => { await deleteRow('supplier_receipts', r.id); await reload() }} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t-2 border-ink"><td className={`${td} font-bold`}>Разом</td><td className={`${num} font-bold`}>{fmt(totalL)}</td><td colSpan={3} /></tr></tfoot>
            </table>
          </Scroll>
        )}
      </Card>
      <Card title="Додати надходження">
        <form onSubmit={add} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1 text-sm font-semibold">Вид пального
            <select required className={`${inputCls} font-normal`} value={fuel} onChange={(e) => setFuel(e.target.value)}>
              <option value="">Оберіть</option>
              {fuels.filter((f) => f.kind === 'fuel').map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <Field label="Літри" type="number" step="0.01" min="0" required value={liters} onChange={(e) => setLiters(e.target.value)} />
          <Field label="кг" hint="Лише для відображення в Донесенні" type="number" step="0.01" min="0" value={kg} onChange={(e) => setKg(e.target.value)} />
          <Field label="№ роздавальної відомості" value={doc} onChange={(e) => setDoc(e.target.value)} />
          {err && <ErrorText>{err}</ErrorText>}
          <Button>Додати</Button>
        </form>
      </Card>
    </div>
  )
}
