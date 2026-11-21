import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { useRefs } from '../auth/Refs.tsx'
import { Button, Card, DeleteX, Empty, ErrorText, Field, fmt, inputCls, Modal, num, Scroll, tbl, td, th, thR } from '../components/ui.tsx'
import { useAsync } from '../hooks/useAsync.ts'
import { deleteRow, insertRow, listPeriodVehicles, listWaybills } from '../lib/db.ts'

export default function Waybills() {
  const { id = '' } = useParams()
  const { vehicles, fuels, vehicleFuels } = useRefs()
  const { data, error, reload } = useAsync(() => listWaybills(id), [id])
  const pv = useAsync(() => listPeriodVehicles(id), [id])

  const [filterId, setFilterId] = useState('')
  const [open, setOpen] = useState(false)
  const [vehicleId, setVehicleId] = useState('')
  const [fuel, setFuel] = useState('')
  const [numr, setNum] = useState('')
  const [used, setUsed] = useState('')
  const [recv, setRecv] = useState('')
  const [odoS, setOdoS] = useState('')
  const [odoE, setOdoE] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [added, setAdded] = useState<string | null>(null)

  const vehicle = vehicles.find((v) => v.id === vehicleId)
  const allowed = vehicleFuels.filter((vf) => vf.vehicle_id === vehicleId).map((vf) => fuels.find((f) => f.id === vf.fuel_type_id)!)
  const fuelName = (fid: string) => fuels.find((f) => f.id === fid)?.name ?? fid
  const list = (data ?? []).filter((w) => !filterId || w.vehicle_id === filterId)

  /** Початок спідометра підставляється: кінець останнього листа машини, а якщо листів ще немає, початкове значення періоду. */
  function pickVehicle(vid: string) {
    setVehicleId(vid); setFuel(''); setAdded(null)
    const ends = (data ?? []).filter((w) => w.vehicle_id === vid && w.odometer_end != null).map((w) => w.odometer_end as number)
    const base = pv.data?.find((x) => x.vehicle_id === vid)?.odometer_open
    const start = ends.length ? Math.max(...ends) : base
    setOdoS(start != null ? String(start) : ''); setOdoE('')
  }

  function openForm() {
    setErr(null); setAdded(null)
    if (filterId) pickVehicle(filterId); else { setVehicleId(''); setFuel(''); setOdoS(''); setOdoE('') }
    setOpen(true)
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    try {
      await insertRow('waybills', {
        period_id: id, vehicle_id: vehicleId, fuel_type_id: fuel, number: numr || null,
        liters_used: Number(used || 0), liters_received: Number(recv || 0),
        odometer_start: odoS ? Number(odoS) : null, odometer_end: odoE ? Number(odoE) : null,
      })
      setAdded(`Додано: ${vehicle?.name}, ${fuelName(fuel)}`)
      setNum(''); setUsed(''); setRecv(''); setErr(null)
      if (odoE) setOdoS(odoE)
      setOdoE('')
      await reload()
    } catch (x) { setErr((x as Error).message) }
  }

  return (
    <>
      <Card
        title="Шляхові листи"
        aside={
          <div className="flex items-center gap-2">
            <select aria-label="Фільтр за технікою" className={`${inputCls} max-w-56`} value={filterId} onChange={(e) => setFilterId(e.target.value)}>
              <option value="">Уся техніка</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.seq}. {v.name}</option>)}
            </select>
            <Button onClick={openForm}>+ Додати лист</Button>
          </div>
        }
      >
        {error && <ErrorText>{error}</ErrorText>}
        {list.length === 0 ? <Empty>Листів немає. Натисніть «+ Додати лист».</Empty> : (
          <Scroll>
            <table className={`${tbl} min-w-[44rem]`}>
              <thead>
                <tr>
                  <th className={th}>Техніка</th><th className={th}>Пальне</th><th className={th}>№ листа</th>
                  <th className={thR}>Отримано, л</th><th className={thR}>Використано, л</th><th className={thR}>Спідометр, км</th><th className={`${th} w-12`} />
                </tr>
              </thead>
              <tbody>
                {list.map((w) => (
                  <tr key={w.id} className="group border-t border-line hover:bg-stripe">
                    <td className={`${td} whitespace-nowrap font-semibold`}>{vehicles.find((v) => v.id === w.vehicle_id)?.name}</td>
                    <td className={`${td} whitespace-nowrap`}>{fuelName(w.fuel_type_id)}</td>
                    <td className={`${td} font-mono`}>{w.number}</td>
                    <td className={num}>{fmt(w.liters_received)}</td>
                    <td className={num}>{fmt(w.liters_used)}</td>
                    <td className={`${num} whitespace-nowrap text-muted`}>{w.odometer_start != null ? `${w.odometer_start} → ${w.odometer_end ?? '?'}` : '–'}</td>
                    <td className="px-2 text-right"><DeleteX label="Видалити лист" onClick={async () => { await deleteRow('waybills', w.id); await reload() }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </Card>

      {open && (
        <Modal title="Додати шляховий лист" onClose={() => setOpen(false)}>
          <form onSubmit={add} className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1 text-sm font-semibold">Техніка
              <select required autoFocus className={`${inputCls} font-normal`} value={vehicleId} onChange={(e) => pickVehicle(e.target.value)}>
                <option value="">Оберіть</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.seq}. {v.name} ({v.military_number})</option>)}
              </select>
            </label>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-semibold">Вид пального
                <select required className={`${inputCls} font-normal`} value={fuel} onChange={(e) => setFuel(e.target.value)} disabled={!vehicleId}>
                  <option value="">{vehicleId ? 'Оберіть' : 'Спершу оберіть техніку'}</option>
                  {allowed.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </label>
              <Field label="№ шляхового листа" value={numr} onChange={(e) => setNum(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Отримано, л" type="number" step="0.01" min="0" value={recv} onChange={(e) => setRecv(e.target.value)} />
              <Field label="Використано, л" type="number" step="0.01" min="0" value={used} onChange={(e) => setUsed(e.target.value)} />
            </div>
            {vehicle && !vehicle.is_generator && (
              <div className="grid grid-cols-2 gap-3.5">
                <Field label="Спідометр: початок, км" type="number" min="0" value={odoS} onChange={(e) => setOdoS(e.target.value)} />
                <Field label="Спідометр: кінець, км" type="number" min="0" value={odoE} onChange={(e) => setOdoE(e.target.value)} />
              </div>
            )}
            {err && <ErrorText>{err}</ErrorText>}
            {added && <p role="status" className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">{added}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Готово</Button>
              <Button>Додати лист</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
