import "server-only";
import { prisma } from "@/lib/prisma";

/** Sugestões iniciais; qualquer linha nova digitada passa a ser sugerida também. */
export const DEFAULT_BUSINESS_LINES = ["Assessoria", "Sites", "Monteiro Educação"];

export async function ReceivableFormLoader() {
  const [clients, accounts, lines] = await Promise.all([
    prisma.client.findMany({
      where: { status: "ATIVO" },
      select: { id: true, type: true, fullName: true, legalName: true, tradeName: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.financialAccount.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.receivable.findMany({
      where: { businessLine: { not: null } },
      distinct: ["businessLine"],
      select: { businessLine: true },
    }),
  ]);
  const businessLines = [...new Set([...DEFAULT_BUSINESS_LINES, ...lines.map((l) => l.businessLine as string)])];
  return { clients, accounts, businessLines };
}
