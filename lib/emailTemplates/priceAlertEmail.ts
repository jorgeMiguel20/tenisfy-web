// lib/emailTemplates/priceAlertEmail.ts
import { formatPrice } from '../formatPrice'
import { SITE_URL } from '../siteUrl'

// As fotos do catálogo estão guardadas como caminhos do site (ex.:
// "/products/normalized/adidas-gazelle.webp"). Num email isso não chega -
// o programa de email não sabe de que site é - por isso junta-se o
// endereço completo do Parjusto. Links que já são completos ficam iguais.
function absoluteImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('/')) return `${SITE_URL}${url}`
  return url
}

// Template simples em HTML puro (sem React Email) - o projeto ainda não
// usa essa biblioteca e isto é só um e-mail, não vale a pena a dependência
// extra. Estilos inline porque é o que os clientes de e-mail suportam de
// forma fiável.
//
// kind:
// - 'price': o preço chegou ao valor pedido (com ou sem tamanho).
// - 'restock': o tamanho escolhido voltou a ter stock (pedido com
//   "Avisar quando voltar a haver stock"), mesmo acima do valor pedido.
export function priceAlertEmailHtml(params: {
  kind?: 'price' | 'restock'
  brandName: string
  modelName: string
  imageUrl: string | null
  size?: string | null
  price: number
  targetPrice: number
  productUrl: string
  unsubscribeUrl: string
}): string {
  const { kind = 'price', brandName, modelName, imageUrl, size, price, targetPrice, productUrl, unsubscribeUrl } = params

  const sizeText = size ? ` no tamanho ${size}` : ''
  const title = kind === 'restock' ? `O teu tamanho voltou!` : 'O preço baixou!'
  const intro =
    kind === 'restock'
      ? `Pediste para ser avisado quando o tamanho ${size} voltasse a ter stock. Já há, a partir de:`
      : `Pediste para ser avisado quando descesse abaixo de ${formatPrice(targetPrice)}${sizeText}. Agora está:`

  return `<!doctype html>
<html lang="pt">
  <body style="margin:0;padding:0;background:#F9FBFC;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FBFC;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:0;overflow:hidden;max-width:480px;border:1px solid rgba(23,35,43,0.1);">
            <tr>
              <td style="background:#123F3A;height:4px;line-height:4px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#123F3A;">Parjusto</p>
                <h1 style="margin:0 0 20px;font-size:20px;color:#17232B;">${title}</h1>

                ${imageUrl ? `<img src="${absoluteImageUrl(imageUrl)}" alt="${modelName}" width="120" style="display:block;border-radius:0;margin-bottom:20px;background:#F9FBFC;" />` : ''}

                <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.03em;color:#5C6770;">${brandName}</p>
                <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#17232B;">${modelName}${size ? ` · tamanho ${size}` : ''}</p>

                <p style="margin:0 0 4px;font-size:13px;color:#5C6770;">
                  ${intro}
                </p>
                <p style="margin:0 0 24px;font-size:32px;font-weight:800;color:#123F3A;">${formatPrice(price)}</p>

                <a href="${productUrl}" style="display:inline-block;background:#123F3A;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:0;">
                  Ver oferta
                </a>

                <p style="margin:32px 0 0;font-size:12px;line-height:18px;color:#5C6770;">
                  Os preços e o stock podem mudar a qualquer momento - confirma sempre na loja antes de comprar. Este alerta já foi usado e foi desativado automaticamente. Se quiseres continuar a acompanhar este ténis, cria um novo alerta na página dele.
                </p>
                <p style="margin:10px 0 0;font-size:12px;color:#5C6770;">
                  Não pediste este alerta? <a href="${unsubscribeUrl}" style="color:#5C6770;">Cancela aqui</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
