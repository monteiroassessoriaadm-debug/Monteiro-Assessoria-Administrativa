// Nomes em português para as opções das Finanças Pessoais.

export const PF_ACCOUNT_TYPES = {
  BANCO: "Banco",
  CONTA_DIGITAL: "Conta digital",
  DINHEIRO: "Dinheiro",
  INVESTIMENTO: "Investimentos",
} as const;

export const PF_DEBT_TYPES = {
  CARTAO: "Cartão",
  EMPRESTIMO_PESSOAL: "Empréstimo pessoal",
  CONSIGNADO: "Consignado",
  FINANCIAMENTO: "Financiamento",
  CHEQUE_ESPECIAL: "Cheque especial",
  FAMILIA: "Família",
  OUTRO: "Outro",
} as const;

export const PF_DEBT_STATUS = {
  EM_DIA: "Em dia",
  ATRASADA: "Atrasada",
  NEGOCIANDO: "Negociando",
  QUITADA: "Quitada",
} as const;

export const PF_DEBT_STATUS_TONE = {
  EM_DIA: "green",
  ATRASADA: "red",
  NEGOCIANDO: "yellow",
  QUITADA: "slate",
} as const;

export const PF_LIQUIDITY = {
  DIARIA: "Diária",
  NO_VENCIMENTO: "No vencimento",
} as const;

export const TONE_TEXT = {
  green: "text-emerald-700",
  yellow: "text-amber-700",
  red: "text-red-700",
  slate: "text-slate-500",
} as const;

export const TONE_BAR = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
  slate: "bg-slate-300",
} as const;

export const TONE_DOT = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
  slate: "bg-slate-300",
} as const;
