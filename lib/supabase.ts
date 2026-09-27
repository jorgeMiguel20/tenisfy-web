// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente público (chave anon) para ler o catálogo - produtos, lojas,
// preços. Nunca tem sessão: o login das contas vive num cliente à parte
// (lib/authBrowser.ts no browser, lib/authServer.ts no servidor). Por isso
// aqui a sessão fica desligada e com uma chave de armazenamento própria -
// senão os dois clientes partilhavam a mesma chave no browser e o
// Supabase avisa que isso pode dar comportamentos estranhos.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'parjusto-catalogo',
  },
})
