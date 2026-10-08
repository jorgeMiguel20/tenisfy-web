// components/OfferClickTracker.tsx
'use client'

import { useEffect } from 'react'

// Conta os cliques em "Ver oferta" (a saída para a loja). É o número que as
// redes de afiliados e as lojas perguntam, e o Vercel Analytics gratuito não
// conta cliques (só visitas).
//
// Funciona para qualquer link com data-offer-click (ver StoreOffersList e a
// barra fixa do telemóvel na página de produto). Usa sendBeacon: o pedido
// segue mesmo que a página mude, e nunca atrasa a abertura da loja.
// Não guarda nada sobre a pessoa - só o ténis, a loja e o sítio do botão
// (ver app/api/out-click/route.ts).
export default function OfferClickTracker() {
  useEffect(() => {
    function handle(event: MouseEvent) {
      // Clique normal (0) ou com o botão do meio, para abrir noutro separador (1).
      if (event.button !== 0 && event.button !== 1) return
      const target = event.target as Element | null
      const link = target?.closest?.('a[data-offer-click]') as HTMLAnchorElement | null
      if (!link) return

      const payload = JSON.stringify({
        product: link.dataset.offerProduct ?? '',
        store: link.dataset.offerStore ?? '',
        placement: link.dataset.offerClick ?? '',
      })

      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/out-click', new Blob([payload], { type: 'application/json' }))
        } else {
          void fetch('/api/out-click', {
            method: 'POST',
            body: payload,
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
          })
        }
      } catch {
        // Contar o clique nunca pode impedir a pessoa de ir para a loja.
      }
    }

    document.addEventListener('click', handle, true)
    document.addEventListener('auxclick', handle, true)
    return () => {
      document.removeEventListener('click', handle, true)
      document.removeEventListener('auxclick', handle, true)
    }
  }, [])

  return null
}
