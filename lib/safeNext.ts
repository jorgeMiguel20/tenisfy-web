// lib/safeNext.ts

// Para onde voltar depois de entrar (?next=/produto/...). Só aceita
// caminhos dentro do próprio site - nunca um endereço de outro site
// (ex.: "//site-malicioso.com" ou "https://..."), para o link de entrada
// não poder ser usado para mandar alguém para fora do Parjusto.
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  return value
}

// Guardado no browser quando se pede o email de entrada, para o link do
// email (que abre a página /entrar/confirmar) saber para onde voltar - só
// funciona se o link for aberto no mesmo browser, o que é o caso normal.
export const LOGIN_NEXT_STORAGE_KEY = 'parjusto-login-next'
