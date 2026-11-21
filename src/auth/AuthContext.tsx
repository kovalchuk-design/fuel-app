import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase.ts'

interface Ctx { session: Session | null; ready: boolean; signOut: () => Promise<void> }
const AuthCtx = createContext<Ctx>({ session: null, ready: false, signOut: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return <AuthCtx.Provider value={{ session, ready, signOut: async () => { await supabase.auth.signOut() } }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
