// app/admin/precos/actions.ts
'use server'

import { isAdminRequest, NOT_AUTHORIZED_ERROR } from '@/lib/adminAuth'

type MarkPricesResult =
  | { success: true; timestamp: string; count: number }
  | { success: false; error: string }

// DESATIVADO (5 out 2026). Este botão marcava TODAS as ofertas como
// "verificadas agora" sem ninguém ter visto as lojas - o site chegou a mostrar
// "Verificado há 6 horas" em preços com um mês. A data de verificação passa a
// mudar só quando uma oferta é mesmo verificada (verificação diária ou
// aprovação de uma proposta em /admin/precos). A função fica só para o
// componente antigo PriceCheckButton.tsx continuar a compilar; já não é
// mostrado em lado nenhum e nunca altera nada.
export async function markPricesVerified(): Promise<MarkPricesResult> {
  if (!(await isAdminRequest())) return { success: false, error: NOT_AUTHORIZED_ERROR }
  return {
    success: false,
    error: 'Desativado: a data de verificação só muda quando a loja é mesmo verificada.',
  }
}
