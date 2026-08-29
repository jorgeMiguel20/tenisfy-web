// lib/emailTemplates/priceAlertEmail.ts
import { formatPrice } from '../formatPrice'

// Template simples em HTML puro (sem React Email) - o projeto ainda não
// usa essa biblioteca e isto é só um e-mail, não vale a pena a dependência
// extra. Estilos inline porque é o que os clientes de e-mail suportam de
// forma fiável.
export function priceAlertEmailHtml(params: {
  brandName: string
  modelName: string
  imageUrl: string | null
  price: number
  targetPrice: number
  productUrl: string
  unsubscribeUrl: string
}): string {
  const { brandName, modelName, imageUrl, price, targetPrice, productUrl, unsubscribeUrl } = params

  return `<!doctype html>
<html lang="pt">
  <body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:480px;">
            <tr>
              <td style="background:#ea580c;height:4px;line-height:4px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#ea580c;">Parjusto</p>
                <h1 style="margin:0 0 20px;font-size:20px;color:#111827;">O preço baixou!</h1>

                ${imageUrl ? `<img src="${imageUrl}" alt="${modelName}" width="120" style="display:block;border-radius:12px;margin-bottom:20px;background:#f9fafb;" />` : ''}

                <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.03em;color:#9ca3af;">${brandName}</p>
                <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#111827;">${modelName}</p>

                <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">
                  Pediste para ser avisado quando descesse abaixo de ${formatPrice(targetPrice)}. Agora está:
                </p>
                <p style="margin:0 0 24px;font-size:32px;font-weight:800;color:#ea580c;">${formatPrice(price)}</p>

                <a href="${productUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:999px;">
                  Ver oferta
                </a>

                <p style="margin:32px 0 0;font-size:12px;line-height:18px;color:#9ca3af;">
                  Este alerta já foi usado e foi desativado automaticamente. Se quiseres continuar a acompanhar este produto, cria um novo alerta na página dele.
                </p>
                <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">
                  Não pediste este alerta? <a href="${unsubscribeUrl}" style="color:#9ca3af;">Cancela aqui</a>.
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
