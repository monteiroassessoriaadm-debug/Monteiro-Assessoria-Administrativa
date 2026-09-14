import { displayClientAddress, displayClientDocument, displayClientName } from "@/lib/client-display";
import { formatDateBR } from "@/lib/utils";

export type FieldType = "text" | "textarea" | "number" | "date";

export type TemplateFieldDef = {
  key: string; // usado como {{key}} no corpo do modelo
  label: string;
  type: FieldType;
  required: boolean;
};

type ClientForTokens = {
  type: string;
  fullName?: string | null;
  legalName?: string | null;
  tradeName?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
};

/** Tokens preenchidos automaticamente a partir do cadastro único do cliente. */
export function getClientTokens(client: ClientForTokens): Record<string, string> {
  return {
    NOME_CLIENTE: displayClientName(client),
    DOCUMENTO_CLIENTE: displayClientDocument(client),
    ENDERECO_CLIENTE: displayClientAddress(client) || "-",
    CIDADE_CLIENTE: client.addressCity || "-",
    ESTADO_CLIENTE: client.addressState || "-",
    CEP_CLIENTE: client.addressZip || "-",
    WHATSAPP_CLIENTE: client.whatsapp || "-",
    EMAIL_CLIENTE: client.email || "-",
    DATA_ATUAL: formatDateBR(new Date()),
  };
}

export const CLIENT_TOKEN_KEYS = [
  "NOME_CLIENTE",
  "DOCUMENTO_CLIENTE",
  "ENDERECO_CLIENTE",
  "CIDADE_CLIENTE",
  "ESTADO_CLIENTE",
  "CEP_CLIENTE",
  "WHATSAPP_CLIENTE",
  "EMAIL_CLIENTE",
  "DATA_ATUAL",
];

/** Substitui {{TOKEN}} pelo valor correspondente. Tokens desconhecidos permanecem visíveis no texto. */
export function renderTemplate(content: string, tokens: Record<string, string>): string {
  return content.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    return key in tokens ? tokens[key] : match;
  });
}

export function parseFieldsSchema(raw: string): TemplateFieldDef[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f): f is TemplateFieldDef =>
        f && typeof f.key === "string" && typeof f.label === "string",
    );
  } catch {
    return [];
  }
}
