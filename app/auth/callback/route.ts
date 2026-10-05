import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // 'invite', 'recovery', etc.
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createAuthClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Convite: usuário autenticado mas sem senha definida — redireciona para definir
      if (type === 'invite') {
        return NextResponse.redirect(`${origin}/login?setup=true`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Algo deu errado — volta para login com mensagem
  return NextResponse.redirect(`${origin}/login?error=callback`)
}
