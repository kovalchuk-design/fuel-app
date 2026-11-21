import { useParams } from 'react-router'
import { useRefs } from '../auth/Refs.tsx'
import { Card, ErrorText, fmt, inputCls, Scroll, tbl, td, th, thR } from '../components/ui.tsx'
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
      <Scroll>
        <table className={`${tbl} min-w-[44rem]`}>
          <thead>
            <tr><th className={`${th} w-12`}>№</th><th className={`${th} w-64`}>Техніка</th><th className={`${th} w-64`}>Пальне</th><th className={`${thR} w-36`}>Залишок, л</th><th className={th} /></tr>
          </thead>
          <tbody>
            {vehicles.flatMap((v, vi) =>
              vehicleFuels.filter((vf) => vf.vehicle_id === v.id).map((vf, i) => {
                const cur = get(v.id, vf.fuel_type_id)
                return (
                  <tr key={v.id + vf.fuel_type_id} className={`${vi % 2 === 1 ? 'bg-stripe' : 'bg-surface'} ${i === 0 ? 'border-t border-line' : ''}`}>
                    <td className={`${td} font-mono text-muted`}>{i === 0 ? v.seq : ''}</td>
                    <td className={`${td} font-semibold`}>{i === 0 ? v.name : ''}</td>
                    <td className={td}>{fuels.find((f) => f.id === vf.fuel_type_id)?.name}</td>
                    <td className="px-2.5 py-1 text-right">
                      <input
                        key={(cur?.opening ?? 0) + '-' + (data?.length ?? 0)}
                        aria-label={`Залишок: ${v.name}, ${fuels.find((f) => f.id === vf.fuel_type_id)?.name}`}
                        type="number" step="0.01" min="0" className={`${inputCls} h-8 w-28 text-right font-mono tabular-nums`}
                        defaultValue={cur ? cur.opening : ''} placeholder={fmt(0)}
                        onBlur={async (e) => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value)
                          if (val === (cur?.opening ?? 0) && cur) return
                          await saveBalance({ period_id: id, vehicle_id: v.id, fuel_type_id: vf.fuel_type_id, opening: val, measured_closing: cur?.measured_closing ?? null })
                          await reload()
                        }}
                      />
                    </td>
                    <td />
                  </tr>
                )
              }),
            )}
          </tbody>
        </table>
      </Scroll>
    </Card>
  )
}
