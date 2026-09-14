"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";

export type SettingsFormState = {
  error?: string;
  success?: boolean;
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

async function getOrCreateSettings() {
  const existing = await prisma.companySettings.findFirst();
  if (existing) return existing;
  return prisma.companySettings.create({ data: {} });
}

export async function updateCompanySettingsAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  await requireRole(Role.ADMIN);

  const settings = await getOrCreateSettings();
  const name = String(formData.get("name") || "").trim();
  const slogan = String(formData.get("slogan") || "").trim();
  const logoFile = formData.get("logo");

  let logoData: string | undefined;
  if (logoFile instanceof File && logoFile.size > 0) {
    if (logoFile.size > MAX_LOGO_BYTES) {
      return { error: "A logo deve ter no máximo 2MB." };
    }
    if (!logoFile.type.startsWith("image/")) {
      return { error: "Envie um arquivo de imagem para a logo." };
    }
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    logoData = `data:${logoFile.type};base64,${buffer.toString("base64")}`;
  }

  await prisma.companySettings.update({
    where: { id: settings.id },
    data: {
      name: name || settings.name,
      slogan: slogan || null,
      ...(logoData ? { logoData } : {}),
    },
  });

  revalidatePath("/configuracoes");
  return { success: true };
}
