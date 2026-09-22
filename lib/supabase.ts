import { createClient } from '@supabase/supabase-js'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser singleton — Client Components
export const supabase = createClient(URL, ANON)

// Service-role client — API routes (bypasses RLS, sem sessão de usuário)
export function createServerClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ANON
  return createClient(URL, key, { auth: { persistSession: false } })
}
