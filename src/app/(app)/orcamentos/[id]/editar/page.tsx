import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { displayClientName } from "@/lib/client-display";
import { QuoteForm } from "../../quote-form";
import { updateQuoteAction } from "../../actions";

export default async function EditarOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [quote, clients, services] = await Promise.all([
    prisma.quote.findUnique({ where: { id }, include: { items: true } }),
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

  if (!quote) notFound();

  const boundAction = updateQuoteAction.bind(null, id);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar orçamento #{quote.number}</h1>
      </div>
      <QuoteForm
        action={boundAction}
        submitLabel="Salvar alterações"
        clients={clients.map((c) => ({ id: c.id, label: displayClientName(c) }))}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          defaultPrice: s.defaultPrice?.toString() ?? null,
          defaultTermDays: s.defaultTermDays,
        }))}
        defaults={{
          clientId: quote.clientId,
          paymentTerms: quote.paymentTerms ?? undefined,
          validUntil: quote.validUntil ? quote.validUntil.toISOString().slice(0, 10) : undefined,
          notes: quote.notes ?? undefined,
          items: quote.items.map((item) => ({
            key: item.id,
            serviceId: item.serviceId ?? "",
            description: item.description,
            quantity: String(item.quantity),
            unitPrice: item.unitPrice.toString(),
            termDays: item.termDays ? String(item.termDays) : "",
          })),
        }}
      />
    </div>
  );
}
