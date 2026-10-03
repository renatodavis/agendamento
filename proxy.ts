import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          list.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh token — mantém sessão viva sem exigir novo login
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Segunda camada para /api: toda rota exige sessão, exceto as que têm
  // autenticação própria (webhook Meta assinado, cron com CRON_SECRET) e o
  // GET de clinic-config, que sem sessão devolve só o nome da clínica.
  // Cada rota continua chamando requireAuth() — isto cobre rotas novas esquecidas.
  if (pathname.startsWith('/api/') && !user && !isPublicApi(pathname, request.method)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Usuário não autenticado tentando acessar rotas protegidas → landing page
  const protectedPaths = ['/dashboard']
  if (!user && protectedPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Usuário autenticado tentando acessar /login ou / → painel
  if (user && (pathname === '/login' || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

const PUBLIC_API_PATHS = ['/api/whatsapp', '/api/appointments/remind']

function isPublicApi(pathname: string, method: string) {
  if (PUBLIC_API_PATHS.includes(pathname)) return true
  return pathname === '/api/clinic-config' && method === 'GET'
}

export const config = {
  // Executa em todas as rotas exceto assets estáticos e Next internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
