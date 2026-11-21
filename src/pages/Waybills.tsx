import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { useRefs } from '../auth/Refs.tsx'
import { Button, Card, Empty, ErrorText, Field, fmt, inputCls, num, Scroll, tbl, td, th, thR } from '../components/ui.tsx'
import { useAsync } from '../hooks/useAsync.ts'
import { deleteRow, insertRow, listWaybills } from '../lib/db.ts'

export default function Waybills() {
  const { id = '' } = useParams()
  const { vehicles, fuels, vehicleFuels } = useRefs()
  const { data, error, reload } = useAsync(() => listWaybills(id), [id])
  const [vehicleId, setVehicleId] = useState('')
  const [fuel, setFuel] = useState('')
  const [numr, setNum] = useState('')
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
        period_id: id, vehicle_id: vehicleId, fuel_type_id: fuel, number: numr || null,
        liters_used: Number(used || 0), liters_received: Number(recv || 0),
        odometer_start: odoS ? Number(odoS) : null, odometer_end: odoE ? Number(odoE) : null,
      })
      setNum(''); setUsed(''); setRecv(''); setOdoS(''); setOdoE(''); setErr(null); await reload()
    } catch (x) { setErr((x as Error).message) }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_21rem]">
      <Card title={vehicle ? `Шляхові листи: ${vehicle.name}` : 'Шляхові листи'} aside={vehicleId ? <button className="text-sm font-semibold text-accent hover:underline" onClick={() => { setVehicleId(''); setFuel('') }}>Показати всі</button> : undefined}>
        {error && <ErrorText>{error}</ErrorText>}
        {list.length === 0 ? <Empty>Листів немає. Оберіть техніку справа й додайте перший.</Empty> : (
          <Scroll>
            <table className={tbl}>
              <thead><tr><th className={th}>Техніка</th><th className={th}>Пальне</th><th className={th}>№ листа</th><th className={thR}>Отримано</th><th className={thR}>Використано</th><th className={thR}>Спідометр</th><th className={th} /></tr></thead>
              <tbody>
                {list.map((w) => (
                  <tr key={w.id} className="border-t border-line hover:bg-stripe">
                    <td className={`${td} font-semibold`}>{vehicles.find((v) => v.id === w.vehicle_id)?.name}</td>
                    <td className={td}>{fuelName(w.fuel_type_id)}</td>
                    <td className={`${td} font-mono`}>{w.number}</td>
                    <td className={num}>{fmt(w.liters_received)}</td>
                    <td className={num}>{fmt(w.liters_used)}</td>
                    <td className={`${num} whitespace-nowrap text-muted`}>{w.odometer_start != null ? `${w.odometer_start} → ${w.odometer_end ?? '?'}` : '–'}</td>
                    <td className="px-2 text-right"><Button variant="danger" aria-label="Видалити лист" className="h-8 px-2" onClick={async () => { await deleteRow('waybills', w.id); await reload() }}>Видалити</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </Card>
      <Card title="Додати шляховий лист">
        <form onSubmit={add} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1 text-sm font-semibold">Техніка
            <select required className={`${inputCls} font-normal`} value={vehicleId} onChange={(e) => { setVehicleId(e.target.value); setFuel('') }}>
              <option value="">Оберіть</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.seq}. {v.name} ({v.military_number})</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">Вид пального
            <select required className={`${inputCls} font-normal`} value={fuel} onChange={(e) => setFuel(e.target.value)} disabled={!vehicleId}>
              <option value="">{vehicleId ? 'Оберіть' : 'Спершу оберіть техніку'}</option>
              {allowed.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <Field label="№ шляхового листа" value={numr} onChange={(e) => setNum(e.target.value)} />
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
          <Button>Додати лист</Button>
        </form>
      </Card>
    </div>
  )
}
