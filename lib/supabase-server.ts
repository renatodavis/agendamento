import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Auth-aware client — lê/escreve sessão via cookies.
// Importar APENAS em Server Components e API routes (nunca em Client Components).
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
