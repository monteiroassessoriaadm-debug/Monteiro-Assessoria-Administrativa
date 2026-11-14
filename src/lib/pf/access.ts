import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import type { SessionPayload } from "@/lib/session";

// Finanças Pessoais são do dono, não da empresa. Ser administrador não basta:
// o e-mail precisa estar na lista PF_OWNER_EMAILS (padrão: o e-mail do dono).
// A conferência vai ao banco a cada pedido, então desativar o usuário ou trocar
// o papel corta o acesso na hora, mesmo com sessão antiga aberta.
const DEFAULT_OWNER_EMAILS = "monteiroassessoriaadm@gmail.com";

function ownerEmails() {
  return (process.env.PF_OWNER_EMAILS || DEFAULT_OWNER_EMAILS)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isPfOwner(userId: string | null | undefined) {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true, active: true },
  });
  return !!user && user.active && user.role === "ADMIN" && ownerEmails().includes(user.email.toLowerCase());
}

/**
 * Para páginas, rotas e ações das Finanças Pessoais. Quem não é o dono recebe
 * "página não encontrada": a aba nem parece existir.
 */
export async function requirePfOwner(): Promise<SessionPayload> {
  const session = await requireSession();
  if (!(await isPfOwner(session.userId))) notFound();
  return session;
}
