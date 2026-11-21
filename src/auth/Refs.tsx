import { createContext, useContext, type ReactNode } from 'react'
import { useAsync } from '../hooks/useAsync.ts'
import { loadRefs } from '../lib/db.ts'

type RefsData = Awaited<ReturnType<typeof loadRefs>>
const RefsCtx = createContext<RefsData | null>(null)

export function RefsProvider({ children }: { children: ReactNode }) {
  const { data, error } = useAsync(loadRefs, [])
  if (error) return <p className="p-6 text-red-700">Помилка завантаження довідників: {error}</p>
  if (!data) return <p className="p-6 text-slate-500">Завантаження…</p>
  return <RefsCtx.Provider value={data}>{children}</RefsCtx.Provider>
}

export function useRefs() {
  const v = useContext(RefsCtx)
  if (!v) throw new Error('RefsProvider відсутній')
  return v
}
