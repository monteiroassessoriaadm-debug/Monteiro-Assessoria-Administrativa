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
