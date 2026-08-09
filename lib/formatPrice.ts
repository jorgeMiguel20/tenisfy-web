// lib/formatPrice.ts

// Formato português: vírgula decimal, espaço antes do símbolo (ex: "120,00 €").
// Única função de formatação de preço do site - reutilizar em vez de usar
// toFixed(2) diretamente, para o separador nunca voltar a divergir por sítio.
const currencyFormatter = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
})

export function formatPrice(value: number): string {
  return currencyFormatter.format(value)
}
