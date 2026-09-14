import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export default async function FluxoCaixaPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const { from, to } = await searchParams;

  const now = new Date();
  const rangeFrom = from ? new Date(from) : startOfMonth(now);
  const rangeTo = to ? new Date(`${to}T23:59:59`) : endOfMonth(now);

  const [receivedIn, paidOut, commissionsOut, pendingReceivables, pendingPayables, pendingCommissions] =
    await Promise.all([
      prisma.receivable.findMany({
        where: { status: "RECEBIDO", receivedAt: { gte: rangeFrom, lte: rangeTo } },
        include: { client: true },
        orderBy: { receivedAt: "asc" },
      }),
      prisma.payable.findMany({
        where: { status: "PAGO", paidAt: { gte: rangeFrom, lte: rangeTo } },
        orderBy: { paidAt: "asc" },
      }),
      prisma.commission.findMany({
        where: { status: "PAGO", paidAt: { gte: rangeFrom, lte: rangeTo } },
        include: { user: true },
        orderBy: { paidAt: "asc" },
      }),
      prisma.receivable.aggregate({ where: { status: "PENDENTE" }, _sum: { amount: true } }),
      prisma.payable.aggregate({ where: { status: "PENDENTE" }, _sum: { amount: true } }),
      prisma.commission.aggregate({ where: { status: "PENDENTE" }, _sum: { amount: true } }),
    ]);

  const totalIn = receivedIn.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalOut =
    paidOut.reduce((sum, p) => sum + Number(p.amount), 0) +
    commissionsOut.reduce((sum, c) => sum + Number(c.amount), 0);
  const saldo = totalIn - totalOut;

  const previsaoEntradas = Number(pendingReceivables._sum.amount ?? 0);
  const previsaoSaidas =
    Number(pendingPayables._sum.amount ?? 0) + Number(pendingCommissions._sum.amount ?? 0);
  const previsaoResultado = previsaoEntradas - previsaoSaidas;

  const fromInput = rangeFrom.toISOString().slice(0, 10);
  const toInput = rangeTo.toISOString().slice(0, 10);

  const movements = [
    ...receivedIn.map((r) => ({
      date: r.receivedAt,
      description: r.description,
      type: "entrada" as const,
      amount: Number(r.amount),
    })),
    ...paidOut.map((p) => ({
      date: p.paidAt,
      description: p.description,
      type: "saida" as const,
      amount: Number(p.amount),
    })),
    ...commissionsOut.map((c) => ({
      date: c.paidAt,
      description: `${c.category === "SALARIO_FIXO" ? "Salário" : c.category === "COMISSAO" ? "Comissão" : "Pagamento"} — ${c.user.name}`,
      type: "saida" as const,
      amount: Number(c.amount),
    })),
  ].sort((a, b) => (a.date && b.date ? a.date.getTime() - b.date.getTime() : 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Fluxo de caixa</h1>
        <p className="text-sm text-slate-500">
          Entradas e saídas realizadas no período, e previsão com base nos lançamentos pendentes.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div>
          <Label>De</Label>
          <Input type="date" name="from" defaultValue={fromInput} />
        </div>
        <div>
          <Label>Até</Label>
          <Input type="date" name="to" defaultValue={toInput} />
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Entradas (realizadas)</p>
          <p className="mt-1 text-lg font-bold text-green-600">{formatCurrencyBRL(totalIn)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Saídas (realizadas)</p>
          <p className="mt-1 text-lg font-bold text-red-600">{formatCurrencyBRL(totalOut)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Saldo do período</p>
          <p className={`mt-1 text-lg font-bold ${saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrencyBRL(saldo)}
          </p>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Previsão de entradas</p>
          <p className="mt-1 text-sm text-slate-700">{formatCurrencyBRL(previsaoEntradas)}</p>
          <p className="text-xs text-slate-400">Contas a receber pendentes</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Previsão de saídas</p>
          <p className="mt-1 text-sm text-slate-700">{formatCurrencyBRL(previsaoSaidas)}</p>
          <p className="text-xs text-slate-400">Contas a pagar e comissões pendentes</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Resultado previsto</p>
          <p
            className={`mt-1 text-sm font-semibold ${previsaoResultado >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {formatCurrencyBRL(previsaoResultado)}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements.map((m, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{formatDateBR(m.date)}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{m.description}</td>
                <td className="px-4 py-3">
                  <span className={m.type === "entrada" ? "text-green-600" : "text-red-600"}>
                    {m.type === "entrada" ? "Entrada" : "Saída"}
                  </span>
                </td>
                <td
                  className={`px-4 py-3 text-right font-medium ${
                    m.type === "entrada" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {m.type === "entrada" ? "+" : "-"} {formatCurrencyBRL(m.amount)}
                </td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  Nenhuma movimentação no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
