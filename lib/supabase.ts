import { createClient } from '@supabase/supabase-js'
import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser singleton — Client Components
export const supabase = createClient(URL, ANON)

// Service-role client — API routes (bypasses RLS, sem sessão de usuário)
export function createServerClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ANON
  return createClient(URL, key, { auth: { persistSession: false } })
}

// Auth-aware client — lê/escreve sessão via cookies (usado para verificar quem chamou)
export async function createAuthClient() {
  const cookieStore = await cookies()
  return createSSRServerClient(URL, ANON, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components não podem setar cookies — ignorar
        }
      },
    },
  })
}
