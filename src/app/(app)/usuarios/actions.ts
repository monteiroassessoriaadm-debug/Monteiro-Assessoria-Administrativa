"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { userSchema } from "@/lib/validations";

export type UserFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createUserAction(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireRole(Role.ADMIN);

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password") || undefined,
    role: formData.get("role"),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;
  if (!data.password) {
    return {
      error: "Senha é obrigatória para novos usuários.",
      fieldErrors: { password: "Informe uma senha." },
    };
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return {
      error: "Já existe um usuário com este e-mail.",
      fieldErrors: { email: "E-mail já cadastrado." },
    };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      active: data.active,
    },
  });

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function updateUserAction(
  userId: string,
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const session = await requireRole(Role.ADMIN);

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password") || undefined,
    role: formData.get("role"),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Verifique os campos destacados.", fieldErrors };
  }

  const data = parsed.data;

  if (userId === session.userId && data.role !== Role.ADMIN) {
    return {
      error: "Você não pode remover o próprio acesso de administrador.",
      fieldErrors: { role: "Ação não permitida." },
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      active: data.active,
      ...(data.password
        ? { passwordHash: await bcrypt.hash(data.password, 10) }
        : {}),
    },
  });

  revalidatePath("/usuarios");
  redirect("/usuarios");
}
