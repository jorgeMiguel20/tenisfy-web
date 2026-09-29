// lib/safeNext.ts

const SAME_SITE_BASE = 'https://parjusto.invalid'

// Para onde voltar depois de entrar (?next=/produto/...). Só aceita
// caminhos dentro do próprio site - nunca um endereço de outro site
// (ex.: "//site-malicioso.com" ou "https://..."), para o link de entrada
// não poder ser usado para mandar alguém para fora do Parjusto.
//
// Os browsers ignoram tabulações e mudanças de linha dentro de endereços,
// por isso "/<tab>/site-malicioso.com" acabava por ser lido como
// "//site-malicioso.com". Agora recusa qualquer carácter de controlo ou
// barra invertida, e confirma no fim que o endereço continua no Parjusto.
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null
  if (value.length > 500) return null
  if (/[\u0000-\u001F\u007F\\]/.test(value)) return null
  if (!value.startsWith('/') || value.startsWith('//')) return null

  try {
    const resolved = new URL(value, SAME_SITE_BASE)
    if (resolved.origin !== SAME_SITE_BASE) return null
    return resolved.pathname + resolved.search + resolved.hash
  } catch {
    return null
  }
}

// Guardado no browser quando se pede o email de entrada, para o link do
// email (que abre a página /entrar/confirmar) saber para onde voltar - só
// funciona se o link for aberto no mesmo browser, o que é o caso normal.
export const LOGIN_NEXT_STORAGE_KEY = 'parjusto-login-next'
