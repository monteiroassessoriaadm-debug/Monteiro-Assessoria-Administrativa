import { prisma } from "@/lib/prisma";
import { displayClientName } from "@/lib/client-display";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { parseContractFields } from "@/lib/contract-render";
import { missingClientData, quotePrefill } from "@/lib/contracts";
import { suggestTemplateSlug } from "@/lib/contract-display";
import { quoteStatusLabels } from "@/lib/lead-labels";
import { ContractWizard } from "./contract-wizard";
import { createContractAction } from "../../actions";

export default async function NovoContratoPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; quoteId?: string; modelo?: string }>;
}) {
  const { clientId, quoteId, modelo } = await searchParams;

  const [clients, templates, quotes] = await Promise.all([
    prisma.client.findMany({ where: { status: "ATIVO" }, orderBy: { createdAt: "desc" } }),
    prisma.contractTemplate.findMany({ where: { active: true }, orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    prisma.quote.findMany({
      where: { status: { notIn: ["CANCELADO", "RECUSADO"] } },
      include: { items: { include: { service: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
  ]);

  // Cliente inativo aberto por atalho também precisa aparecer na lista.
  if (clientId && !clients.some((c) => c.id === clientId)) {
    const extra = await prisma.client.findUnique({ where: { id: clientId } });
    if (extra) clients.unshift(extra);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Novo contrato</h1>
        <p className="text-sm text-slate-500">
          Escolha o cliente e o modelo. Os dados do cadastro, da Monteiro e do orçamento entram sozinhos; você só revisa o que falta.
        </p>
      </div>
      <ContractWizard
        action={createContractAction}
        clients={clients.map((c) => ({ id: c.id, label: displayClientName(c), missing: missingClientData(c) }))}
        templates={templates
          .filter((t) => t.slug !== "ebooks-termos")
          .map((t) => ({
            id: t.id,
            slug: t.slug,
            name: t.name,
            kind: t.kind,
            description: t.description,
            version: t.version,
            fields: parseContractFields(t.fieldsSchema),
          }))}
        quotes={quotes.map((q) => {
          const total = q.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
          return {
            id: q.id,
            clientId: q.clientId,
            label: `Nº ${q.number} — ${formatCurrencyBRL(total)} — ${quoteStatusLabels[q.status] ?? q.status} (${formatDateBR(q.createdAt)})`,
            approved: q.status === "APROVADO",
            prefill: quotePrefill(q),
            suggestedSlug: suggestTemplateSlug(q.items.map((i) => `${i.service?.name ?? ""} ${i.description}`)),
          };
        })}
        defaults={{ clientId, quoteId, templateSlug: modelo }}
      />
    </div>
  );
}
