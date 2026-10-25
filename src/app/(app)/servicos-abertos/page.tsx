import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { serviceInstanceStatusLabels, serviceInstanceStatusTone } from "@/lib/lead-labels";

const ACTIVE_SERVICE_STATUSES = ["ABERTO", "EM_ANDAMENTO", "EM_REVISAO"] as const;

export default async function ServicosAbertosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; overdue?: string; due?: string }>;
}) {
  const { status, overdue: overdueParam, due } = await searchParams;
  const statuses = status ? status.split(",") : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  const impliesActiveOnly = statuses.length === 0 && Boolean(overdueParam || due);

  const instances = await prisma.serviceInstance.findMany({
    where: {
      ...(statuses.length === 1
        ? { status: statuses[0] as never }
        : statuses.length > 1
          ? { status: { in: statuses as never[] } }
          : impliesActiveOnly
            ? { status: { in: [...ACTIVE_SERVICE_STATUSES] } }
            : {}),
      ...(overdueParam ? { dueDate: { lt: today } } : {}),
      ...(due === "today" ? { dueDate: { gte: today, lte: endOfToday } } : {}),
    },
    include: { client: true, responsible: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Serviços em andamento</h1>
        <p className="text-sm text-slate-500">
          Abertos automaticamente a partir de orçamentos e propostas aprovados.
        </p>
      </div>

      <form className="flex gap-3">
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">Todos os status</option>
          {Object.entries(serviceInstanceStatusLabels).map(([value, label]) => (
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
              <th className="px-4 py-3">Serviço</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Prazo</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {instances.map((s) => {
              const overdue =
                s.dueDate &&
                s.dueDate < today &&
                s.status !== "CONCLUIDO" &&
                s.status !== "CANCELADO";
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/servicos-abertos/${s.id}`} className="hover:underline">
                      #{s.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.title}</td>
                  <td className="px-4 py-3 text-slate-600">{displayClientName(s.client)}</td>
                  <td className="px-4 py-3 text-slate-600">{s.responsible?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.price ? formatCurrencyBRL(s.price.toString()) : "-"}
                  </td>
                  <td className={`px-4 py-3 ${overdue ? "font-medium text-red-600" : "text-slate-600"}`}>
                    {formatDateBR(s.dueDate)}
                    {overdue ? " (atrasado)" : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={serviceInstanceStatusTone[s.status]}>
                      {serviceInstanceStatusLabels[s.status]}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {instances.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Nenhum serviço aberto ainda. Aprove um orçamento ou proposta para abrir o
                  primeiro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
