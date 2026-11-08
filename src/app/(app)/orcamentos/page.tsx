import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { ActiveFilter, statusLabel, statusList } from "@/components/ui/active-filter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCard, TableCardList, TableCardEmpty } from "@/components/ui/table-card";
import { daysAgo, formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { quoteStatusLabels, quoteStatusTone } from "@/lib/lead-labels";

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; dias?: string }>;
}) {
  const { status, dias } = await searchParams;
  const statuses = statusList(status);
  const days = Number(dias) > 0 ? Number(dias) : null;
  // Aprovados contam da data da resposta, como no cartão do dashboard; os demais, da criação.
  const since = days ? daysAgo(days) : null;
  const onlyApproved = statuses.length === 1 && statuses[0] === "APROVADO";

  const quotes = await prisma.quote.findMany({
    where: {
      ...(statuses.length > 0 ? { status: { in: statuses as never[] } } : {}),
      ...(since ? (onlyApproved ? { respondedAt: { gte: since } } : { createdAt: { gte: since } }) : {}),
    },
    include: { client: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const total = quotes.reduce(
    (sum, q) => sum + q.items.reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0),
    0,
  );
  const filterLabel = [
    statuses.length ? statusLabel(statuses, quoteStatusLabels) : null,
    days ? `últimos ${days} dias` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Orçamentos</h1>
          <p className="text-sm text-slate-500">
            Gerados a partir do cadastro único do cliente.
          </p>
        </div>
        <Link href="/orcamentos/novo">
          <Button>
            <Plus className="h-4 w-4" /> Novo orçamento
          </Button>
        </Link>
      </div>

      <FilterDrawer>
      <form className="flex flex-wrap gap-3">
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-11 min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-base md:h-10 md:text-sm"
        >
          <option value="">Todos os status</option>
          {Object.entries(quoteStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>
      </FilterDrawer>

      <ActiveFilter
        label={filterLabel ? `${filterLabel} (${quotes.length}, total ${formatCurrencyBRL(total)})` : null}
        clearHref="/orcamentos"
      />

      <Card className="table-scroll hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Validade</th>
              <th className="px-4 py-3">Criado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quotes.map((q) => {
              const total = q.items.reduce(
                (sum, i) => sum + i.quantity * Number(i.unitPrice),
                0,
              );
              return (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/orcamentos/${q.id}`} className="hover:underline">
                      #{q.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {displayClientName(q.client)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrencyBRL(total)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={quoteStatusTone[q.status]}>
                      {quoteStatusLabels[q.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateBR(q.validUntil)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateBR(q.createdAt)}
                  </td>
                </tr>
              );
            })}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Nenhum orçamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <TableCardList>
        {quotes.map((q) => {
          const total = q.items.reduce((sum, i) => sum + i.quantity * Number(i.unitPrice), 0);
          return (
            <TableCard
              key={q.id}
              href={`/orcamentos/${q.id}`}
              title={`#${q.number} — ${displayClientName(q.client)}`}
              subtitle={formatCurrencyBRL(total)}
              fields={[
                {
                  label: "Status",
                  value: <Badge tone={quoteStatusTone[q.status]}>{quoteStatusLabels[q.status]}</Badge>,
                },
                { label: "Validade", value: formatDateBR(q.validUntil) },
                { label: "Criado em", value: formatDateBR(q.createdAt) },
              ]}
            />
          );
        })}
        {quotes.length === 0 && <TableCardEmpty>Nenhum orçamento encontrado.</TableCardEmpty>}
      </TableCardList>
    </div>
  );
}
