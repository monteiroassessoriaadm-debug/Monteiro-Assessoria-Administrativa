import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withCurrentOption } from "@/lib/options";
import { displayClientName } from "@/lib/client-display";
import { MediaContentForm } from "../../media-form";
import { updateMediaContentAction } from "../../actions";

export default async function EditarConteudoMidiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [content, activeClients, activeUsers] = await Promise.all([
    prisma.mediaContent.findUnique({ where: { id }, include: { client: true } }),
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

  if (!content) notFound();

  const currentResponsible = content.responsibleId
    ? await prisma.user.findUnique({
        where: { id: content.responsibleId },
        select: { id: true, name: true },
      })
    : null;
  const users = withCurrentOption(activeUsers, currentResponsible);
  const clients = withCurrentOption(
    activeClients.map((c) => ({ id: c.id, name: displayClientName(c) })),
    { id: content.client.id, name: displayClientName(content.client) },
  );

  const boundAction = updateMediaContentAction.bind(null, id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Editar conteúdo #{content.number}
        </h1>
      </div>
      <MediaContentForm
        action={boundAction}
        clients={clients.map((c) => ({ id: c.id, label: c.name }))}
        users={users}
        submitLabel="Salvar alterações"
        defaultValues={{
          clientId: content.clientId,
          title: content.title,
          description: content.description ?? undefined,
          type: content.type ?? undefined,
          platform: content.platform ?? undefined,
          scheduledDate: content.scheduledDate
            ? content.scheduledDate.toISOString().slice(0, 10)
            : undefined,
          responsibleId: content.responsibleId ?? undefined,
          notes: content.notes ?? undefined,
        }}
      />
    </div>
  );
}
