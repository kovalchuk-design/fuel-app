export interface OdoWaybill { vehicleId: string; odometerStart?: number | null; odometerEnd?: number | null }
export interface VehicleOdometer { start: number | null; end: number | null; km: number | null }

/**
 * Спідометр належить машині. Початок = значення на початок періоду, а якщо його не задано, найменший початок із листів.
 * Кінець = найбільший кінець із листів; якщо листів немає, машина не рухалась і кінець = початок.
 */
export function vehicleOdometers(open: Map<string, number | null>, waybills: OdoWaybill[]): (vehicleId: string) => VehicleOdometer {
  const minStart = new Map<string, number>()
  const maxEnd = new Map<string, number>()
  for (const w of waybills) {
    if (w.odometerStart != null) minStart.set(w.vehicleId, Math.min(minStart.get(w.vehicleId) ?? Infinity, w.odometerStart))
    if (w.odometerEnd != null) maxEnd.set(w.vehicleId, Math.max(maxEnd.get(w.vehicleId) ?? -Infinity, w.odometerEnd))
  }
  return (id) => {
    const start = open.get(id) ?? minStart.get(id) ?? null
    const end = maxEnd.get(id) ?? start
    return { start, end, km: start != null && end != null ? end - start : null }
  }
}
