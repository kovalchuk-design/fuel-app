import { Link, Navigate, Route, Routes } from 'react-router'
import { useAuth } from './auth/AuthContext.tsx'
import { RefsProvider } from './auth/Refs.tsx'
import Balances from './pages/Balances.tsx'
import Login from './pages/Login.tsx'
import PeriodLayout from './pages/PeriodLayout.tsx'
import Periods from './pages/Periods.tsx'
import Receipts from './pages/Receipts.tsx'
import Reconcile from './pages/Reconcile.tsx'
import Waybills from './pages/Waybills.tsx'

export default function App() {
  const { session, ready, signOut } = useAuth()
  if (!ready) return <p className="p-6 text-muted">Завантаження…</p>
  if (!session) return <Login />
  return (
    <RefsProvider>
      <div className="min-h-screen">
        <header className="bg-ink text-white">
          <nav className="mx-auto flex h-12 max-w-6xl items-center gap-4 px-4">
            <Link to="/" className="text-[15px] font-bold tracking-tight">Облік ПММ</Link>
            <span className="ml-auto hidden truncate text-xs text-white/70 sm:block">{session.user.email}</span>
            <button onClick={() => void signOut()} className="h-8 rounded-md border border-white/25 px-3 text-xs font-semibold hover:bg-white/10">Вийти</button>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">
          <Routes>
            <Route path="/" element={<Periods />} />
            <Route path="/period/:id" element={<PeriodLayout />}>
              <Route index element={<Navigate to="receipts" replace />} />
              <Route path="balances" element={<Balances />} />
              <Route path="receipts" element={<Receipts />} />
              <Route path="waybills" element={<Waybills />} />
              <Route path="reconcile" element={<Reconcile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </RefsProvider>
  )
}

