import { prisma } from "@/lib/prisma";
import { displayClientName } from "@/lib/client-display";
import { MediaContentForm } from "../media-form";
import { createMediaContentAction } from "../actions";

export default async function NovoConteudoMidiaPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;

  const [clients, users] = await Promise.all([
    prisma.client.findMany({
      where: { status: "ATIVO" },
      select: { id: true, type: true, fullName: true, legalName: true, tradeName: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Novo conteúdo de mídia</h1>
      </div>
      <MediaContentForm
        action={createMediaContentAction}
        clients={clients.map((c) => ({ id: c.id, label: displayClientName(c) }))}
        users={users}
        defaultValues={{ clientId }}
      />
    </div>
  );
}
