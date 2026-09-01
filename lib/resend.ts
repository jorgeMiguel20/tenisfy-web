// lib/resend.ts
import { Resend } from 'resend'

// Cliente único do Resend para todos os e-mails transacionais do site
// (confirmação de alerta, aviso de descida de preço). RESEND_API_KEY vem
// do dashboard do Resend (Settings -> API Keys) - ver instruções de
// configuração enviadas ao Jorge. Sem a variável definida, `resend` fica
// null e o resto do código sabe não tentar enviar (em vez de rebentar).
const apiKey = process.env.RESEND_API_KEY

export const resend = apiKey ? new Resend(apiKey) : null

// Remetente de todos os e-mails - o domínio (ou subdomínio) tem de estar
// verificado no Resend para isto funcionar. Configurável por variável de
// ambiente para poder trocar sem alterar código (ex: passar de
// "alertas@parjusto.pt" para "no-reply@parjusto.pt").
export const ALERTS_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Parjusto <alertas@parjusto.pt>'
