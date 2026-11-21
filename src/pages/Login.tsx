import { useState, type FormEvent } from 'react'
import { Button, ErrorText, Field } from '../components/ui.tsx'
import { supabase } from '../lib/supabase.ts'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setError(error ? 'Невірна пошта або пароль' : null)
    setBusy(false)
  }

  return (
    <div className="ledger-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6">
        <h1 className="text-2xl font-bold tracking-tight">Облік ПММ</h1>
        <p className="mb-5 mt-1 text-sm text-muted">Пальне, шляхові листи, звітні документи</p>
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <Field label="Пошта" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Пароль" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <ErrorText>{error}</ErrorText>}
          <Button disabled={busy}>{busy ? 'Входимо…' : 'Увійти'}</Button>
        </form>
      </div>
    </div>
  )
}
