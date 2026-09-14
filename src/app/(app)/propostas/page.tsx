import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { proposalStatusLabels, proposalStatusTone } from "@/lib/lead-labels";

export default async function PropostasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const proposals = await prisma.proposal.findMany({
    where: status ? { status: status as never } : undefined,
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Propostas</h1>
          <p className="text-sm text-slate-500">
            Diagnóstico, solução e investimento — a partir do cadastro do cliente.
          </p>
        </div>
        <Link href="/propostas/novo">
          <Button>
            <Plus className="h-4 w-4" /> Nova proposta
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
          {Object.entries(proposalStatusLabels).map(([value, label]) => (
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
              <th className="px-4 py-3">Demanda</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Criada em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proposals.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link href={`/propostas/${p.id}`} className="hover:underline">
                    #{p.number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{displayClientName(p.client)}</td>
                <td className="px-4 py-3 max-w-xs truncate text-slate-600">{p.demand}</td>
                <td className="px-4 py-3">
                  <Badge tone={proposalStatusTone[p.status]}>
                    {proposalStatusLabels[p.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDateBR(p.createdAt)}</td>
              </tr>
            ))}
            {proposals.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Nenhuma proposta encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
