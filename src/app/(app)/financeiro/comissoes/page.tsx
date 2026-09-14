import Link from "next/link";
import { Plus } from "lucide-react";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import {
  commissionCategoryLabels,
  commissionStatusLabels,
  commissionStatusTone,
} from "@/lib/lead-labels";
import { CommissionStatusActions } from "./status-actions";

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; category?: string }>;
}) {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const { userId, category } = await searchParams;

  const [commissions, users] = await Promise.all([
    prisma.commission.findMany({
      where: {
        userId: userId || undefined,
        category: (category as never) || undefined,
      },
      include: { user: true, client: true },
      orderBy: [{ status: "asc" }, { date: "desc" }],
      take: 200,
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalsByCategory = commissions.reduce(
    (acc, c) => {
      const key = c.category;
      if (!acc[key]) acc[key] = { pendente: 0, pago: 0 };
      if (c.status === "PENDENTE") acc[key].pendente += Number(c.amount);
      if (c.status === "PAGO") acc[key].pago += Number(c.amount);
      return acc;
    },
    {} as Record<string, { pendente: number; pago: number }>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Comissões e pagamentos</h1>
          <p className="text-sm text-slate-500">
            Lançamentos separados por categoria — salário fixo, comissão e outros pagamentos nunca
            se misturam.
          </p>
        </div>
        <Link href="/financeiro/comissoes/novo">
          <Button>
            <Plus className="h-4 w-4" /> Novo lançamento
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {Object.entries(commissionCategoryLabels).map(([value, label]) => {
          const t = totalsByCategory[value] ?? { pendente: 0, pago: 0 };
          return (
            <Card key={value} className="p-4">
              <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
              <p className="mt-1 text-sm text-slate-600">
                Pendente: {formatCurrencyBRL(t.pendente)}
              </p>
              <p className="text-sm text-slate-600">Pago: {formatCurrencyBRL(t.pago)}</p>
            </Card>
          );
        })}
      </div>

      <form className="flex flex-wrap gap-3">
        <Select name="userId" defaultValue={userId ?? ""} className="w-56">
          <option value="">Todos os usuários</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <Select name="category" defaultValue={category ?? ""} className="w-56">
          <option value="">Todas as categorias</option>
          {Object.entries(commissionCategoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {commissions.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{c.user.name}</td>
                <td className="px-4 py-3 text-slate-600">{commissionCategoryLabels[c.category]}</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.client ? displayClientName(c.client) : "-"}
                </td>
                <td className="px-4 py-3 text-slate-600">{formatCurrencyBRL(c.amount.toString())}</td>
                <td className="px-4 py-3 text-slate-600">{formatDateBR(c.date)}</td>
                <td className="px-4 py-3">
                  <Badge tone={commissionStatusTone[c.status]}>
                    {commissionStatusLabels[c.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <CommissionStatusActions commissionId={c.id} status={c.status} />
                </td>
              </tr>
            ))}
            {commissions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Nenhum lançamento ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
