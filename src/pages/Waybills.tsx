import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { useRefs } from '../auth/Refs.tsx'
import { Button, Card, ErrorText, Field, fmt, inputCls } from '../components/ui.tsx'
import { useAsync } from '../hooks/useAsync.ts'
import { deleteRow, insertRow, listWaybills } from '../lib/db.ts'

export default function Waybills() {
  const { id = '' } = useParams()
  const { vehicles, fuels, vehicleFuels } = useRefs()
  const { data, error, reload } = useAsync(() => listWaybills(id), [id])
  const [vehicleId, setVehicleId] = useState('')
  const [fuel, setFuel] = useState('')
  const [num, setNum] = useState('')
  const [used, setUsed] = useState('')
  const [recv, setRecv] = useState('')
  const [odoS, setOdoS] = useState('')
  const [odoE, setOdoE] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const vehicle = vehicles.find((v) => v.id === vehicleId)
  const allowed = vehicleFuels.filter((vf) => vf.vehicle_id === vehicleId).map((vf) => fuels.find((f) => f.id === vf.fuel_type_id)!)
  const fuelName = (fid: string) => fuels.find((f) => f.id === fid)?.name ?? fid
  const list = (data ?? []).filter((w) => !vehicleId || w.vehicle_id === vehicleId)

  async function add(e: FormEvent) {
    e.preventDefault()
    try {
      await insertRow('waybills', {
        period_id: id, vehicle_id: vehicleId, fuel_type_id: fuel, number: num || null,
        liters_used: Number(used || 0), liters_received: Number(recv || 0),
        odometer_start: odoS ? Number(odoS) : null, odometer_end: odoE ? Number(odoE) : null,
      })
      setNum(''); setUsed(''); setRecv(''); setOdoS(''); setOdoE(''); setErr(null); await reload()
    } catch (x) { setErr((x as Error).message) }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_22rem]">
      <Card title="Шляхові листи">
        {error && <ErrorText>{error}</ErrorText>}
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500"><tr><th>Техніка</th><th>Пальне</th><th>№</th><th className="text-right">Отримано</th><th className="text-right">Використано</th><th className="text-right">Спідометр</th><th /></tr></thead>
          <tbody>
            {list.map((w) => (
              <tr key={w.id} className="border-t border-slate-100">
                <td className="py-1.5">{vehicles.find((v) => v.id === w.vehicle_id)?.name}</td>
                <td>{fuelName(w.fuel_type_id)}</td>
                <td>{w.number}</td>
                <td className="text-right font-mono">{fmt(w.liters_received)}</td>
                <td className="text-right font-mono">{fmt(w.liters_used)}</td>
                <td className="text-right font-mono text-slate-500">{w.odometer_start != null ? `${w.odometer_start}→${w.odometer_end ?? '?'}` : '–'}</td>
                <td className="text-right"><Button variant="danger" onClick={async () => { await deleteRow('waybills', w.id); await reload() }}>✕</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="mt-2 text-sm text-slate-500">Листів немає.</p>}
      </Card>
      <Card title="Додати шляховий лист">
        <form onSubmit={add} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">Техніка
            <select required className={inputCls} value={vehicleId} onChange={(e) => { setVehicleId(e.target.value); setFuel('') }}>
              <option value="">— оберіть —</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.seq}. {v.name} ({v.military_number})</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">Вид пального
            <select required className={inputCls} value={fuel} onChange={(e) => setFuel(e.target.value)} disabled={!vehicleId}>
              <option value="">— оберіть —</option>
              {allowed.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <Field label="№ шляхового листа" value={num} onChange={(e) => setNum(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Отримано, л" type="number" step="0.01" min="0" value={recv} onChange={(e) => setRecv(e.target.value)} />
            <Field label="Використано, л" type="number" step="0.01" min="0" value={used} onChange={(e) => setUsed(e.target.value)} />
          </div>
          {vehicle && !vehicle.is_generator && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Спідометр: початок" type="number" min="0" value={odoS} onChange={(e) => setOdoS(e.target.value)} />
              <Field label="Спідометр: кінець" type="number" min="0" value={odoE} onChange={(e) => setOdoE(e.target.value)} />
            </div>
          )}
          {err && <ErrorText>{err}</ErrorText>}
          <Button>Додати</Button>
        </form>
      </Card>
    </div>
  )
}
