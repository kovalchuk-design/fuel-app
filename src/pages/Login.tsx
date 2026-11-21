import { useState, type FormEvent } from 'react'
import { Button, Card, ErrorText, Field } from '../components/ui.tsx'
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
    <div className="mx-auto mt-24 max-w-sm px-4">
      <Card>
        <h1 className="mb-4 text-xl font-bold">Вхід</h1>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Пошта" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Пароль" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <ErrorText>{error}</ErrorText>}
          <Button disabled={busy}>Увійти</Button>
        </form>
      </Card>
    </div>
  )
}
