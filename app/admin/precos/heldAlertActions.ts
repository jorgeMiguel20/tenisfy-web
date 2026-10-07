// app/admin/precos/heldAlertActions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { isAdminRequest, NOT_AUTHORIZED_ERROR } from '@/lib/adminAuth'
import { checkAndSendPriceAlerts } from '@/lib/priceAlerts'

type SendHeldResult = { success: true; sent: number } | { success: false; error: string }

// Botão "Enviar" da secção "Alertas retidos" (ver lib/priceAlerts.ts,
// travões de segurança). Só se usa depois de o Jorge confirmar na loja que
// o preço está mesmo certo. Envia apenas os alertas indicados - nunca
// outros que estejam retidos.
export async function sendHeldAlerts(
  items: { alertId: string; productId: string }[]
): Promise<SendHeldResult> {
  if (!(await isAdminRequest())) return { success: false, error: NOT_AUTHORIZED_ERROR }
  if (items.length === 0) return { success: true, sent: 0 }

  try {
    const result = await checkAndSendPriceAlerts(
      items.map((i) => i.productId),
      { forceAlertIds: items.map((i) => i.alertId) }
    )
    revalidatePath('/admin/precos')
    return { success: true, sent: result.sent }
  } catch (err) {
    console.error('Falha ao enviar alertas retidos:', err)
    return { success: false, error: 'Falha ao enviar. Tenta outra vez daqui a pouco.' }
  }
}
