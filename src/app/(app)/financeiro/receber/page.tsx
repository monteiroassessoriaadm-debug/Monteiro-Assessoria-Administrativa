import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { receivableStatusLabels, receivableStatusTone } from "@/lib/lead-labels";
import { ReceivableStatusActions } from "./status-actions";

export default async function ContasAReceberPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const receivables = await prisma.receivable.findMany({
    where: status ? { status: status as never } : undefined,
    include: { client: true, account: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    take: 200,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totals = receivables.reduce(
    (acc, r) => {
      if (r.status === "PENDENTE") acc.pendente += Number(r.amount);
      if (r.status === "RECEBIDO") acc.recebido += Number(r.amount);
      return acc;
    },
    { pendente: 0, recebido: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Contas a receber</h1>
          <p className="text-sm text-slate-500">
            Total pendente: {formatCurrencyBRL(totals.pendente)} · Recebido:{" "}
            {formatCurrencyBRL(totals.recebido)}
          </p>
        </div>
        <Link href="/financeiro/receber/novo">
          <Button>
            <Plus className="h-4 w-4" /> Nova conta a receber
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
          {Object.entries(receivableStatusLabels).map(([value, label]) => (
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
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Conta</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {receivables.map((r) => {
              const overdue = r.status === "PENDENTE" && r.dueDate && r.dueDate < today;
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.description}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.client ? displayClientName(r.client) : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrencyBRL(r.amount.toString())}</td>
                  <td className={`px-4 py-3 ${overdue ? "font-medium text-red-600" : "text-slate-600"}`}>
                    {formatDateBR(r.dueDate)}
                    {overdue ? " (vencida)" : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.account?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={receivableStatusTone[r.status]}>
                      {receivableStatusLabels[r.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <ReceivableStatusActions receivableId={r.id} status={r.status} />
                  </td>
                </tr>
              );
            })}
            {receivables.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Nenhuma conta a receber ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
