import { useParams } from 'react-router'
import { useRefs } from '../auth/Refs.tsx'
import DocumentsPanel from '../components/DocumentsPanel.tsx'
import { Card, ErrorText, fmt, num, Scroll, tbl, td, th, thR } from '../components/ui.tsx'
import { useAsync } from '../hooks/useAsync.ts'
import { aggregateByFuel, buildVehicleFuelRows, reconcileReceipts, validatePeriod, vehicleOdometers } from '../lib/calc/index.ts'
import { getPeriod, getSettings, listBalances, listPeriodVehicles, listReceipts, listWaybills } from '../lib/db.ts'

export default function Reconcile() {
  const { id = '' } = useParams()
  const { vehicles, fuels, vehicleFuels } = useRefs()
  const { data, error } = useAsync(async () => {
    const [bal, rec, wb, period, settings, pv] = await Promise.all([listBalances(id), listReceipts(id), listWaybills(id), getPeriod(id), getSettings(), listPeriodVehicles(id)])
    return { bal, rec, wb, period, settings, pv }
  }, [id])
  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <p className="text-muted">Завантаження…</p>

  const waybills = data.wb.map((w) => ({
    vehicleId: w.vehicle_id, fuelTypeId: w.fuel_type_id, litersUsed: w.liters_used, litersReceived: w.liters_received,
    odometerStart: w.odometer_start, odometerEnd: w.odometer_end,
  }))
  const receipts = data.rec.map((r) => ({ fuelTypeId: r.fuel_type_id, liters: r.liters }))
  const rows = buildVehicleFuelRows(data.bal.map((b) => ({ vehicleId: b.vehicle_id, fuelTypeId: b.fuel_type_id, opening: b.opening })), waybills)
  const odo = vehicleOdometers(new Map(data.pv.map((x) => [x.vehicle_id, x.odometer_open])), waybills)
  const totals = aggregateByFuel(rows, receipts)
  const recon = reconcileReceipts(rows, receipts).filter((r) => r.supplier !== 0 || r.distributed !== 0)
  const issues = validatePeriod(rows, receipts, waybills)
  const fname = (f: string) => fuels.find((x) => x.id === f)?.name ?? f
  const vname = (v: string) => vehicles.find((x) => x.id === v)?.name ?? v
  const empty = rows.length === 0 && receipts.length === 0

  return (
    <div className="flex flex-col gap-5">
      {empty ? (
        <div role="status" className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">Немає даних для звірки. Додайте надходження й шляхові листи.</div>
      ) : issues.length === 0 ? (
        <div role="status" className="rounded-lg border border-accent/30 bg-accent-soft px-4 py-3">
          <p className="font-bold text-accent">Усе зійшлось</p>
          <p className="text-sm text-ink/80">Розподіл по авто дорівнює надходженню від постачальника по кожному виду пального. Документи можна завантажувати.</p>
        </div>
      ) : (
        <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3">
          <p className="font-bold text-danger">Розбіжностей: {issues.length}. Документи заблоковані</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-ink/90">
            {issues.map((i, k) => <li key={k}>{[i.vehicleId && vname(i.vehicleId), i.fuelTypeId && fname(i.fuelTypeId), i.message].filter(Boolean).join(': ')}</li>)}
          </ul>
        </div>
      )}

      <DocumentsPanel
        blocked={issues.length > 0 || rows.length === 0}
        input={{ period: data.period, vehicles, fuels, vehicleFuels, balances: data.bal, periodVehicles: data.pv, receipts: data.rec, waybills: data.wb, settings: data.settings }}
      />

      <Card title="Звірка надходжень">
        <Scroll>
          <table className={tbl}>
            <thead><tr><th className={th}>Пальне</th><th className={thR}>Від постачальника, л</th><th className={thR}>Розподілено по авто, л</th><th className={thR}>Різниця</th></tr></thead>
            <tbody>
              {recon.map((r) => (
                <tr key={r.fuelTypeId} className={`border-t border-line ${r.ok ? '' : 'bg-danger-soft'}`}>
                  <td className={`${td} font-semibold`}>{fname(r.fuelTypeId)}</td>
                  <td className={num}>{fmt(r.supplier)}</td>
                  <td className={num}>{fmt(r.distributed)}</td>
                  <td className="px-2.5 py-1.5 text-right">
                    <span className={`rounded-full px-2 py-0.5 font-mono text-xs font-medium ${r.ok ? 'bg-accent-soft text-accent' : 'bg-danger text-white'}`}>{r.ok ? 'збігається' : fmt(r.diff)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
      </Card>

      <Card title="Зведення по видах пального (для Донесення), л">
        <Scroll>
          <table className={tbl}>
            <thead><tr><th className={th}>Пальне</th><th className={thR}>На початок</th><th className={thR}>Прибуло</th><th className={thR}>Витрата</th><th className={thR}>На кінець</th></tr></thead>
            <tbody>
              {totals.map((t) => (
                <tr key={t.fuelTypeId} className="border-t border-line hover:bg-stripe">
                  <td className={`${td} font-semibold`}>{fname(t.fuelTypeId)}</td>
                  {[t.opening, t.received, t.used, t.closing].map((n, k) => <td key={k} className={`${num} ${k === 3 ? 'font-bold' : ''}`}>{fmt(n)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
      </Card>

      <Card title="По техніці (для Розшифровки), л">
        <Scroll>
          <table className={tbl}>
            <thead><tr><th className={th}>Техніка</th><th className={th}>Пальне</th><th className={thR}>Пробіг, км</th><th className={thR}>Початок</th><th className={thR}>Отримано</th><th className={thR}>Використано</th><th className={thR}>Кінець</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.vehicleId + r.fuelTypeId} className="border-t border-line hover:bg-stripe">
                  <td className={`${td} font-semibold`}>{vname(r.vehicleId)}</td><td className={td}>{fname(r.fuelTypeId)}</td>
                  <td className={`${num} text-muted`}>{rows[i - 1]?.vehicleId === r.vehicleId ? '' : fmt(odo(r.vehicleId).km)}</td>
                  {[r.opening, r.received, r.used, r.closing].map((n, k) => <td key={k} className={`${num} ${k === 3 ? 'font-bold' : ''}`}>{fmt(n)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
      </Card>
    </div>
  )
}
