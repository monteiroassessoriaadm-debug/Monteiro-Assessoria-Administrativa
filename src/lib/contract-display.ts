import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";

/** "R$ 300,00", "R$ 100,00/mês" ou os dois juntos (combo). */
export function contractValue(c: { totalValue: unknown; monthlyValue: unknown }) {
  const parts = [
    c.totalValue ? formatCurrencyBRL(Number(c.totalValue)) : null,
    c.monthlyValue ? `${formatCurrencyBRL(Number(c.monthlyValue))}/mês` : null,
  ].filter(Boolean);
  return parts.join(" + ") || "-";
}

/** A data que importa para acompanhar: fim do contrato ou o próximo reajuste. */
export function contractNextDate(c: { endDate: Date | null; renewalDate: Date | null }) {
  if (c.endDate) return `Fim ${formatDateBR(c.endDate)}`;
  if (c.renewalDate) return `Reajuste ${formatDateBR(c.renewalDate)}`;
  return "-";
}

/** Modelo mais provável para um orçamento, pelo nome dos serviços. O usuário pode trocar. */
export function suggestTemplateSlug(serviceNames: string[]) {
  const text = serviceNames.join(" ").toLowerCase();
  const hasSite = /site|crm|sistema|landing|p[aá]gina/.test(text);
  const hasMaint = /manuten|hospedagem|mensal/.test(text);
  if (hasSite && hasMaint) return "site-combo";
  if (hasMaint) return "manutencao-site";
  if (hasSite) return "criacao-site";
  if (/tr[aá]fego|an[uú]ncio|ads/.test(text)) return "trafego-pago";
  if (/social|m[ií]dia|design|v[ií]deo|reels|arte|instagram/.test(text)) return "social-media";
  return "assessoria-avulso";
}

/** Mensagem de WhatsApp para enviar o contrato e explicar a assinatura gratuita pelo gov.br. */
export function contractWhatsAppMessage(params: { clientName: string; code: string; title: string }) {
  const first = params.clientName.trim().split(/\s+/)[0] || params.clientName;
  return [
    `Oi, ${first}! Tudo bem? 😊`,
    ``,
    `Segue o contrato ${params.code} (${params.title}) em PDF. Dá uma lida com calma e, se tiver qualquer dúvida, é só me chamar.`,
    ``,
    `Para assinar é gratuito, pelo gov.br, e leva uns 2 minutinhos:`,
    `1. Salve o PDF no celular.`,
    `2. Entre em assinador.iti.br e faça login com sua conta gov.br (precisa ser nível prata ou ouro).`,
    `3. Toque em "Escolher arquivo", selecione o contrato e posicione sua assinatura no fim do documento.`,
    `4. Confirme com o código que chega no seu app gov.br e baixe o arquivo assinado.`,
    `5. Me envie aqui o PDF assinado.`,
    ``,
    `Se sua conta gov.br for bronze ou você tiver dificuldade, me avisa que te ajudo por chamada. 👍`,
    ``,
    `Monteiro Assessoria`,
  ].join("\n");
}
