import { useParams } from 'react-router'
import { useRefs } from '../auth/Refs.tsx'
import { Button, Card, ErrorText, fmt } from '../components/ui.tsx'
import { useAsync } from '../hooks/useAsync.ts'
import { aggregateByFuel, buildVehicleFuelRows, reconcileReceipts, validatePeriod } from '../lib/calc/index.ts'
import { listBalances, listReceipts, listWaybills } from '../lib/db.ts'

export default function Reconcile() {
  const { id = '' } = useParams()
  const { vehicles, fuels } = useRefs()
  const { data, error } = useAsync(async () => {
    const [bal, rec, wb] = await Promise.all([listBalances(id), listReceipts(id), listWaybills(id)])
    return { bal, rec, wb }
  }, [id])
  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <p className="text-slate-500">Завантаження…</p>

  const waybills = data.wb.map((w) => ({
    vehicleId: w.vehicle_id, fuelTypeId: w.fuel_type_id, litersUsed: w.liters_used, litersReceived: w.liters_received,
    odometerStart: w.odometer_start, odometerEnd: w.odometer_end,
  }))
  const receipts = data.rec.map((r) => ({ fuelTypeId: r.fuel_type_id, liters: r.liters }))
  const rows = buildVehicleFuelRows(data.bal.map((b) => ({ vehicleId: b.vehicle_id, fuelTypeId: b.fuel_type_id, opening: b.opening })), waybills)
  const totals = aggregateByFuel(rows, receipts)
  const recon = reconcileReceipts(rows, receipts)
  const issues = validatePeriod(rows, receipts, waybills)
  const fname = (f: string) => fuels.find((x) => x.id === f)?.name ?? f
  const vname = (v: string) => vehicles.find((x) => x.id === v)?.name ?? v

  return (
    <div className="flex flex-col gap-4">
      <Card title="Звірка надходжень">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500"><tr><th>Пальне</th><th className="text-right">Від постачальника</th><th className="text-right">Розподілено по авто</th><th className="text-right">Різниця</th></tr></thead>
          <tbody>
            {recon.map((r) => (
              <tr key={r.fuelTypeId} className={`border-t border-slate-100 ${r.ok ? '' : 'bg-red-50'}`}>
                <td className="py-1.5">{fname(r.fuelTypeId)}</td>
                <td className="text-right font-mono">{fmt(r.supplier)}</td>
                <td className="text-right font-mono">{fmt(r.distributed)}</td>
                <td className={`text-right font-mono ${r.ok ? 'text-emerald-700' : 'font-bold text-red-700'}`}>{r.ok ? 'ОК' : fmt(r.diff)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {issues.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-sm text-red-700">
            {issues.map((i, k) => <li key={k}>{[i.vehicleId && vname(i.vehicleId), i.fuelTypeId && fname(i.fuelTypeId), i.message].filter(Boolean).join(' · ')}</li>)}
          </ul>
        )}
        <div className="mt-4 flex items-center gap-3">
          <Button disabled={issues.length > 0 || rows.length === 0}>Згенерувати документи</Button>
          <span className="text-xs text-slate-500">{issues.length > 0 ? 'Усуньте розбіжності, щоб згенерувати документи.' : 'Генерація документів — наступний етап.'}</span>
        </div>
      </Card>

      <Card title="Зведення по видах пального (Донесення), л">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500"><tr><th>Пальне</th><th className="text-right">На початок</th><th className="text-right">Прибуло</th><th className="text-right">Витрата</th><th className="text-right">На кінець</th></tr></thead>
          <tbody>
            {totals.map((t) => (
              <tr key={t.fuelTypeId} className="border-t border-slate-100">
                <td className="py-1.5">{fname(t.fuelTypeId)}</td>
                {[t.opening, t.received, t.used, t.closing].map((n, k) => <td key={k} className="text-right font-mono">{fmt(n)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="По техніці (Розшифровка), л">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-slate-500"><tr><th>Техніка</th><th>Пальне</th><th className="text-right">Пробіг, км</th><th className="text-right">Початок</th><th className="text-right">Отримано</th><th className="text-right">Використано</th><th className="text-right">Кінець</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.vehicleId + r.fuelTypeId} className="border-t border-slate-100">
                <td className="py-1.5">{vname(r.vehicleId)}</td><td>{fname(r.fuelTypeId)}</td>
                <td className="text-right font-mono text-slate-500">{fmt(r.km)}</td>
                {[r.opening, r.received, r.used, r.closing].map((n, k) => <td key={k} className="text-right font-mono">{fmt(n)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
