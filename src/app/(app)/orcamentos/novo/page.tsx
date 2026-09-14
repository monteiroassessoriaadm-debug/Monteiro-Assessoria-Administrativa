import { prisma } from "@/lib/prisma";
import { displayClientName } from "@/lib/client-display";
import { QuoteForm } from "../quote-form";
import { createQuoteAction } from "../actions";

export default async function NovoOrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;

  const [clients, services] = await Promise.all([
    prisma.client.findMany({
      where: { status: "ATIVO" },
      select: {
        id: true,
        type: true,
        fullName: true,
        legalName: true,
        tradeName: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.service.findMany({
      where: { active: true },
      select: { id: true, name: true, defaultPrice: true, defaultTermDays: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Novo orçamento</h1>
      </div>
      <QuoteForm
        action={createQuoteAction}
        clients={clients.map((c) => ({ id: c.id, label: displayClientName(c) }))}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          defaultPrice: s.defaultPrice?.toString() ?? null,
          defaultTermDays: s.defaultTermDays,
        }))}
        defaults={clientId ? { clientId } : undefined}
      />
    </div>
  );
}
