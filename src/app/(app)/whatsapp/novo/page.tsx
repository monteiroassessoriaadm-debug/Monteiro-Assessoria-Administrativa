import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { displayClientName } from "@/lib/client-display";
import { getClientTokens, renderTemplate } from "@/lib/document-tokens";
import { WhatsAppMessageForm } from "../message-form";
import { createWhatsAppMessageAction } from "../actions";

export default async function NovaMensagemWhatsAppPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  if (!clientId) notFound();

  const [client, templates] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.whatsAppTemplate.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!client) notFound();

  const tokens = getClientTokens(client);
  const templatesWithContent = templates.map((t) => ({
    id: t.id,
    name: t.name,
    renderedContent: renderTemplate(t.content, tokens),
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Registrar WhatsApp — {displayClientName(client)}
        </h1>
      </div>
      <WhatsAppMessageForm
        action={createWhatsAppMessageAction}
        clientId={client.id}
        templates={templatesWithContent}
      />
    </div>
  );
}
