// Serviço "Criação de Sites": confecção (pagamento único) + manutenção mensal opcional.
// No CRM são dois itens do catálogo (Serviços) com os nomes abaixo; o site público
// junta os dois num card só, lendo os preços do catálogo quando estão cadastrados.

export const CRIACAO_DE_SITES = {
  categoria: "Criação de Sites",
  nomeConfeccao: "Criação de Sites — Confecção",
  nomeManutencao: "Criação de Sites — Manutenção mensal",
  precoConfeccao: 350,
  precoManutencao: 80,
  descricao:
    "Um site profissional pro seu negócio, feito pra abrir bem no celular, com o pré-agendamento que chega pronto no seu WhatsApp.",
  incluiConfeccao: [
    "Site responsivo (feito para celular)",
    "Apresentação, serviços e preços",
    "Portfólio com fotos dos seus trabalhos",
    "Links das redes sociais",
    "Pré-agendamento que envia a mensagem pronta para o seu WhatsApp",
    "Publicação na internet",
    "QR Codes para divulgação",
  ],
  incluiManutencao: [
    "Atualização de preços, fotos, serviços, horários e textos",
    "Ajustes e melhorias",
  ],
  exemplo: {
    nome: "Amanda Reis — nail designer e maquiadora em Redenção-PA",
    url: "https://site-amanda-reis.vercel.app",
  },
} as const;

export function isCriacaoDeSites(serviceName: string) {
  return serviceName.trim().toLowerCase().startsWith("criação de sites");
}
