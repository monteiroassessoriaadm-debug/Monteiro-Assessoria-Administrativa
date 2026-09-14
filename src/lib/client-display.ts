import { maskCpf, maskCnpj } from "@/lib/utils";

type ClientLike = {
  type: string;
  fullName?: string | null;
  legalName?: string | null;
  tradeName?: string | null;
};

export function displayClientName(c: ClientLike) {
  if (c.type === "PF") return c.fullName ?? "(sem nome)";
  return c.tradeName || c.legalName || "(sem razão social)";
}

export function displayClientDocument(c: {
  type: string;
  cpf?: string | null;
  cnpj?: string | null;
}) {
  if (c.type === "PF") return c.cpf ? maskCpf(c.cpf) : "-";
  return c.cnpj ? maskCnpj(c.cnpj) : "-";
}

export function displayClientAddress(c: {
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
}) {
  const line1 = [c.addressStreet, c.addressNumber].filter(Boolean).join(", ");
  const line2 = [c.addressNeighborhood, c.addressCity, c.addressState]
    .filter(Boolean)
    .join(" - ");
  return [line1, c.addressComplement, line2, c.addressZip]
    .filter(Boolean)
    .join(" — ");
}
