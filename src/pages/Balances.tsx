import { useParams } from 'react-router'
import { useRefs } from '../auth/Refs.tsx'
import { Card, ErrorText, fmt, inputCls } from '../components/ui.tsx'
import { useAsync } from '../hooks/useAsync.ts'
import { listBalances, saveBalance } from '../lib/db.ts'

/** Залишки на початок періоду: для першого періоду вводяться вручну, далі переносяться автоматично. */
export default function Balances() {
  const { id = '' } = useParams()
  const { vehicles, fuels, vehicleFuels } = useRefs()
  const { data, error, reload } = useAsync(() => listBalances(id), [id])

  const get = (v: string, f: string) => data?.find((b) => b.vehicle_id === v && b.fuel_type_id === f)

  return (
    <Card title="Залишки пального в баках на початок періоду, л">
      {error && <ErrorText>{error}</ErrorText>}
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-slate-500"><tr><th>№</th><th>Техніка</th><th>Пальне</th><th className="w-32 text-right">Залишок, л</th></tr></thead>
        <tbody>
          {vehicles.flatMap((v, vi) =>
            vehicleFuels.filter((vf) => vf.vehicle_id === v.id).map((vf, i) => {
              const cur = get(v.id, vf.fuel_type_id)
              return (
                <tr key={v.id + vf.fuel_type_id} className={`border-t border-slate-100 ${vi % 2 === 1 ? 'bg-slate-100' : 'bg-white'}`}>
                  <td className="py-1 text-slate-500">{i === 0 ? v.seq : ''}</td>
                  <td>{i === 0 ? v.name : ''}</td>
                  <td>{fuels.find((f) => f.id === vf.fuel_type_id)?.name}</td>
                  <td className="text-right">
                    <input
                      key={(cur?.opening ?? 0) + '-' + (data?.length ?? 0)}
                      type="number" step="0.01" min="0" className={`${inputCls} w-28 text-right font-mono`}
                      defaultValue={cur ? cur.opening : ''} placeholder={fmt(0)}
                      onBlur={async (e) => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value)
                        if (val === (cur?.opening ?? 0) && cur) return
                        await saveBalance({ period_id: id, vehicle_id: v.id, fuel_type_id: vf.fuel_type_id, opening: val, measured_closing: cur?.measured_closing ?? null })
                        await reload()
                      }}
                    />
                  </td>
                </tr>
              )
            }),
          )}
        </tbody>
      </table>
    </Card>
  )
}
