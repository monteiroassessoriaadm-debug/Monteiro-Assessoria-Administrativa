import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCard, TableCardList, TableCardEmpty } from "@/components/ui/table-card";
import { formatDateBR } from "@/lib/utils";

export default async function ProspeccaoPage() {
  const prospects = await prisma.prospectingEntry.findMany({
    include: { responsible: true, potentialService: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Prospecção ativa</h1>
          <p className="text-sm text-slate-500">
            Listas de empresas e pessoas potenciais, antes de virarem leads.
          </p>
        </div>
        <Link href="/prospeccao/novo">
          <Button>
            <Plus className="h-4 w-4" /> Novo registro
          </Button>
        </Link>
      </div>

      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Segmento</th>
              <th className="px-4 py-3">Cidade</th>
              <th className="px-4 py-3">Serviço potencial</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Próximo contato</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {prospects.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/prospeccao/${p.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.segment ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">{p.city ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {p.potentialService?.name ?? "-"}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.responsible?.name ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDateBR(p.nextContactDate)}
                </td>
                <td className="px-4 py-3">
                  {p.convertedLeadId ? (
                    <Badge tone="green">Convertido em lead</Badge>
                  ) : (
                    <Badge tone="slate">Em prospecção</Badge>
                  )}
                </td>
              </tr>
            ))}
            {prospects.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Nenhum registro de prospecção ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <TableCardList>
        {prospects.map((p) => (
          <TableCard
            key={p.id}
            href={`/prospeccao/${p.id}`}
            title={p.name}
            subtitle={[p.segment, p.city].filter(Boolean).join(" · ") || undefined}
            fields={[
              { label: "Serviço potencial", value: p.potentialService?.name ?? "-" },
              { label: "Responsável", value: p.responsible?.name ?? "-" },
              { label: "Próximo contato", value: formatDateBR(p.nextContactDate) },
              {
                label: "Status",
                value: p.convertedLeadId ? (
                  <Badge tone="green">Convertido em lead</Badge>
                ) : (
                  <Badge tone="slate">Em prospecção</Badge>
                ),
              },
            ]}
          />
        ))}
        {prospects.length === 0 && (
          <TableCardEmpty>Nenhum registro de prospecção ainda.</TableCardEmpty>
        )}
      </TableCardList>
    </div>
  );
}
