// lib/siteUrl.ts

// Domínio canónico do site, usado no metadataBase (resolve o og:image e
// outras tags relativas), no robots.txt e no sitemap.xml - um único sítio
// para mudar se o domínio voltar a mudar no futuro. Fixo (não vem de uma
// variável de ambiente) para nunca depender de configuração em falta na
// Vercel e voltar a apontar para o domínio antigo sem ninguém reparar.
export const SITE_URL = 'https://parjusto.pt'
