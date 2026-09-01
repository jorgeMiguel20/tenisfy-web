// lib/emailTemplates/priceAlertConfirmationEmail.ts
import { formatPrice } from '../formatPrice'

// E-mail de dupla confirmação: só depois de clicar aqui é que o alerta
// passa a poder disparar. Evita que alguém crie alertas com o e-mail de
// outra pessoa e ajuda a reputação de envio do domínio no Resend.
export function priceAlertConfirmationEmailHtml(params: {
  brandName: string
  modelName: string
  imageUrl: string | null
  targetPrice: number
  confirmUrl: string
}): string {
  const { brandName, modelName, imageUrl, targetPrice, confirmUrl } = params

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
                <h1 style="margin:0 0 20px;font-size:20px;color:#111827;">Confirma o teu alerta de preço</h1>

                ${imageUrl ? `<img src="${imageUrl}" alt="${modelName}" width="120" style="display:block;border-radius:12px;margin-bottom:20px;background:#f9fafb;" />` : ''}

                <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.03em;color:#9ca3af;">${brandName}</p>
                <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#111827;">${modelName}</p>

                <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">
                  Vamos avisar-te por e-mail assim que o preço descer abaixo de
                  <strong style="color:#111827;">${formatPrice(targetPrice)}</strong>. Confirma este e-mail para ativares o alerta:
                </p>

                <a href="${confirmUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:999px;">
                  Confirmar alerta
                </a>

                <p style="margin:32px 0 0;font-size:12px;line-height:18px;color:#9ca3af;">
                  Não pediste este alerta? Ignora este e-mail - sem confirmação, nada é ativado.
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
