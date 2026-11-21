import { NavLink, Route, Routes } from 'react-router'
import Home from './pages/Home.tsx'

const nav = [{ to: '/', label: 'Головна' }]

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl gap-4 px-4 py-3">
          <span className="font-bold">Облік ПММ</span>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className="text-slate-600 hover:text-slate-900">
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </div>
  )
}
