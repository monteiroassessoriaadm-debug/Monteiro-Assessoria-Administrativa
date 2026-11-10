// Campos que o Jurídico preenche sozinho a partir do CRM. Sem dependências,
// para o gerador de SQL dos modelos e os testes também usarem.

export const COMPANY_TOKEN_KEYS = [
  "contratada_nome",
  "contratada_cnpj",
  "contratada_endereco",
  "contratada_representante",
  "contratada_whatsapp",
  "foro",
  "cidade_assinatura",
] as const;

export const CLIENT_TOKEN_KEYS = [
  "cliente_nome",
  "cliente_qualificacao",
  "cpf_cnpj",
  "cliente_endereco",
  "cliente_cidade",
  "cliente_estado",
  "cliente_cep",
  "cliente_whatsapp",
  "cliente_email",
] as const;

export const CONTRACT_TOKEN_KEYS = ["contrato_numero", "data_atual", "data_extenso", "orcamento_numero"] as const;

export const AUTO_TOKEN_KEYS: string[] = [...COMPANY_TOKEN_KEYS, ...CLIENT_TOKEN_KEYS, ...CONTRACT_TOKEN_KEYS];

export const AUTO_TOKEN_LABELS: Record<string, string> = {
  contratada_nome: "Nome da Monteiro",
  contratada_cnpj: "CNPJ da Monteiro",
  contratada_endereco: "Endereço da Monteiro",
  contratada_representante: "Quem assina pela Monteiro",
  contratada_whatsapp: "WhatsApp da Monteiro",
  foro: "Foro",
  cidade_assinatura: "Cidade da assinatura",
  cliente_nome: "Nome do cliente",
  cliente_qualificacao: "Qualificação completa do cliente (PF ou PJ)",
  cpf_cnpj: "CPF ou CNPJ do cliente",
  cliente_endereco: "Endereço do cliente",
  cliente_cidade: "Cidade do cliente",
  cliente_estado: "Estado do cliente",
  cliente_cep: "CEP do cliente",
  cliente_whatsapp: "WhatsApp do cliente",
  cliente_email: "E-mail do cliente",
  contrato_numero: "Número do contrato (MON-AAAA-NNN)",
  data_atual: "Data de hoje (dd/mm/aaaa)",
  data_extenso: "Data de hoje por extenso",
  orcamento_numero: "Número do orçamento ligado",
};

/** Campos que o modelo pode pedir e que vêm prontos do orçamento aceito (editáveis antes de gerar). */
export const QUOTE_PREFILL_KEYS = ["servico_descricao", "valor", "forma_pagamento", "prazo"] as const;
