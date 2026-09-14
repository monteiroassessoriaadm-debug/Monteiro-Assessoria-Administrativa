import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { quoteStatusLabels, quoteStatusTone } from "@/lib/lead-labels";

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const quotes = await prisma.quote.findMany({
    where: status ? { status: status as never } : undefined,
    include: { client: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      <form className="flex gap-3">
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
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

      <Card className="overflow-hidden">
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
    </div>
  );
}
