export const LEAD_STAGES = [
  "NOVO_LEAD",
  "PRIMEIRO_CONTATO",
  "EM_ATENDIMENTO",
  "INTERESSADO",
  "ORCAMENTO_ENVIADO",
  "NEGOCIACAO",
  "CONTRATADO",
  "PERDIDO",
] as const;

export const stageLabels: Record<string, string> = {
  NOVO_LEAD: "Novo lead",
  PRIMEIRO_CONTATO: "Primeiro contato",
  EM_ATENDIMENTO: "Em atendimento",
  INTERESSADO: "Interessado",
  ORCAMENTO_ENVIADO: "Orçamento enviado",
  NEGOCIACAO: "Negociação",
  CONTRATADO: "Contratado",
  PERDIDO: "Perdido",
};

export const temperatureTone: Record<string, "red" | "yellow" | "green"> = {
  FRIO: "red",
  MORNO: "yellow",
  QUENTE: "green",
};

export const temperatureLabel: Record<string, string> = {
  FRIO: "🔴 Frio",
  MORNO: "🟡 Morno",
  QUENTE: "🟢 Quente",
};

export const quoteStatusLabels: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  VISUALIZADO: "Visualizado",
  EM_NEGOCIACAO: "Em negociação",
  APROVADO: "Aprovado",
  RECUSADO: "Recusado",
  EXPIRADO: "Expirado",
};

export const quoteStatusTone: Record<
  string,
  "slate" | "blue" | "yellow" | "green" | "red"
> = {
  RASCUNHO: "slate",
  ENVIADO: "blue",
  VISUALIZADO: "blue",
  EM_NEGOCIACAO: "yellow",
  APROVADO: "green",
  RECUSADO: "red",
  EXPIRADO: "slate",
};

export const proposalStatusLabels: Record<string, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  APROVADA: "Aprovada",
  RECUSADA: "Recusada",
  EXPIRADA: "Expirada",
};

export const proposalStatusTone: Record<
  string,
  "slate" | "blue" | "green" | "red"
> = {
  RASCUNHO: "slate",
  ENVIADA: "blue",
  APROVADA: "green",
  RECUSADA: "red",
  EXPIRADA: "slate",
};

export const documentStatusLabels: Record<string, string> = {
  RASCUNHO: "Rascunho",
  GERADO: "Gerado",
  ENVIADO: "Enviado",
  AGUARDANDO_ASSINATURA: "Aguardando assinatura",
  ASSINADO: "Assinado",
  CANCELADO: "Cancelado",
};

export const documentStatusTone: Record<
  string,
  "slate" | "blue" | "yellow" | "green" | "red"
> = {
  RASCUNHO: "slate",
  GERADO: "blue",
  ENVIADO: "blue",
  AGUARDANDO_ASSINATURA: "yellow",
  ASSINADO: "green",
  CANCELADO: "red",
};

export const serviceInstanceStatusLabels: Record<string, string> = {
  ABERTO: "Aberto",
  EM_ANDAMENTO: "Em andamento",
  EM_REVISAO: "Em revisão",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export const serviceInstanceStatusTone: Record<
  string,
  "slate" | "blue" | "yellow" | "green" | "red"
> = {
  ABERTO: "slate",
  EM_ANDAMENTO: "blue",
  EM_REVISAO: "yellow",
  CONCLUIDO: "green",
  CANCELADO: "red",
};

export const receivableStatusLabels: Record<string, string> = {
  PENDENTE: "Pendente",
  RECEBIDO: "Recebido",
  CANCELADO: "Cancelado",
};

export const receivableStatusTone: Record<string, "slate" | "yellow" | "green" | "red"> = {
  PENDENTE: "yellow",
  RECEBIDO: "green",
  CANCELADO: "red",
};

export const payableStatusLabels: Record<string, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
};

export const payableStatusTone: Record<string, "slate" | "yellow" | "green" | "red"> = {
  PENDENTE: "yellow",
  PAGO: "green",
  CANCELADO: "red",
};

export const commissionCategoryLabels: Record<string, string> = {
  SALARIO_FIXO: "Salário / fixo",
  COMISSAO: "Comissão",
  OUTRO_PAGAMENTO: "Outro pagamento",
};

export const commissionStatusLabels: Record<string, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
};

export const commissionStatusTone: Record<string, "yellow" | "green"> = {
  PENDENTE: "yellow",
  PAGO: "green",
};

export const mediaContentStatusLabels: Record<string, string> = {
  IDEIA: "Ideia",
  EM_PRODUCAO: "Em produção",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  PUBLICADO: "Publicado",
  CANCELADO: "Cancelado",
};

export const mediaContentStatusTone: Record<
  string,
  "slate" | "blue" | "yellow" | "green" | "red" | "purple"
> = {
  IDEIA: "slate",
  EM_PRODUCAO: "blue",
  AGUARDANDO_APROVACAO: "yellow",
  APROVADO: "purple",
  REPROVADO: "red",
  PUBLICADO: "green",
  CANCELADO: "red",
};

export const calendarEventTypeLabels: Record<string, string> = {
  ATENDIMENTO: "Atendimento",
  REUNIAO: "Reunião",
  PRAZO: "Prazo",
  ENTREGA: "Entrega",
  PROSPECCAO: "Prospecção",
  TAREFA: "Tarefa",
  PUBLICACAO: "Publicação",
  GRAVACAO: "Gravação",
  RETORNO_CLIENTE: "Retorno de cliente",
};
