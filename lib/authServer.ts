// lib/authServer.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient, type User } from '@supabase/supabase-js'

// Só para Server Actions e Route Handlers (os únicos sítios onde o Next.js
// deixa gravar cookies). As páginas nunca usam isto - ver a explicação em
// lib/authBrowser.ts.
export async function createAuthServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Chamado fora de uma Server Action / Route Handler - nesse
            // caso não há como gravar cookies, e o browser renova a sessão
            // sozinho.
          }
        },
      },
    }
  )
}

// Utilizador com sessão iniciada, confirmado junto do Supabase (getUser faz
// sempre essa verificação - ao contrário de getSession, que só lê o cookie
// e pode ser falsificado). null se não houver sessão válida.
export async function getVerifiedUser(): Promise<User | null> {
  const supabase = await createAuthServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

// Cliente com a service role key (acesso total, ignora RLS) - só no
// servidor, e só depois de confirmar quem é o utilizador.
export function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
