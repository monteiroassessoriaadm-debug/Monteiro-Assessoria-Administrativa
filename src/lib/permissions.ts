import "server-only";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/enums";
import { getSession, type SessionPayload } from "@/lib/session";

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    redirect("/dashboard?erro=sem-permissao");
  }
  return session;
}

export const isAdmin = (role: Role) => role === Role.ADMIN;
export const canManageCadastros = (role: Role) =>
  role === Role.ADMIN || role === Role.GESTOR;
