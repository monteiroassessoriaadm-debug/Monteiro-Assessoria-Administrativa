import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { payableStatusLabels, payableStatusTone } from "@/lib/lead-labels";
import { PayableStatusActions } from "./status-actions";

export default async function ContasAPagarPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const payables = await prisma.payable.findMany({
    where: status ? { status: status as never } : undefined,
    include: { account: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    take: 200,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totals = payables.reduce(
    (acc, p) => {
      if (p.status === "PENDENTE") acc.pendente += Number(p.amount);
      if (p.status === "PAGO") acc.pago += Number(p.amount);
      return acc;
    },
    { pendente: 0, pago: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Contas a pagar</h1>
          <p className="text-sm text-slate-500">
            Total pendente: {formatCurrencyBRL(totals.pendente)} · Pago:{" "}
            {formatCurrencyBRL(totals.pago)}
          </p>
        </div>
        <Link href="/financeiro/pagar/novo">
          <Button>
            <Plus className="h-4 w-4" /> Nova conta a pagar
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
          {Object.entries(payableStatusLabels).map(([value, label]) => (
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
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Conta</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payables.map((p) => {
              const overdue = p.status === "PENDENTE" && p.dueDate && p.dueDate < today;
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.description}</td>
                  <td className="px-4 py-3 text-slate-600">{p.supplier ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrencyBRL(p.amount.toString())}</td>
                  <td className={`px-4 py-3 ${overdue ? "font-medium text-red-600" : "text-slate-600"}`}>
                    {formatDateBR(p.dueDate)}
                    {overdue ? " (vencida)" : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.account?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={payableStatusTone[p.status]}>{payableStatusLabels[p.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <PayableStatusActions payableId={p.id} status={p.status} />
                  </td>
                </tr>
              );
            })}
            {payables.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Nenhuma conta a pagar ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
