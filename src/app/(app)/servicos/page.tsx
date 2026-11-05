import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCard, TableCardList, TableCardEmpty } from "@/components/ui/table-card";
import { formatCurrencyBRL } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { ToggleActiveButton } from "./toggle-active-button";

export default async function ServicosPage() {
  const session = await getSession();
  const canManage = session?.role === "ADMIN" || session?.role === "GESTOR";

  const services = await prisma.service.findMany({
    include: { defaultResponsible: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Catálogo de serviços
          </h1>
          <p className="text-sm text-slate-500">
            Preços e prazos configuráveis — nada fixo no código.
          </p>
        </div>
        {canManage && (
          <Link href="/servicos/novo">
            <Button>
              <Plus className="h-4 w-4" /> Novo serviço
            </Button>
          </Link>
        )}
      </div>

      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Serviço</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Preço padrão</th>
              <th className="px-4 py-3">Prazo padrão</th>
              <th className="px-4 py-3">Responsável padrão</th>
              <th className="px-4 py-3">Status</th>
              {canManage && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {services.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {s.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{s.category ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {s.defaultPrice ? formatCurrencyBRL(s.defaultPrice.toString()) : "-"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {s.defaultTermDays ? `${s.defaultTermDays} dias` : "-"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {s.defaultResponsible?.name ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={s.active ? "green" : "slate"}>
                    {s.active ? "Ativo" : "Inativo"}
                  </Badge>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/servicos/${s.id}/editar`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <ToggleActiveButton serviceId={s.id} active={s.active} />
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Nenhum serviço cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <TableCardList>
        {services.map((s) => (
          <TableCard
            key={s.id}
            title={s.name}
            subtitle={s.category ?? undefined}
            fields={[
              {
                label: "Preço padrão",
                value: s.defaultPrice ? formatCurrencyBRL(s.defaultPrice.toString()) : "-",
              },
              { label: "Prazo padrão", value: s.defaultTermDays ? `${s.defaultTermDays} dias` : "-" },
              { label: "Responsável padrão", value: s.defaultResponsible?.name ?? "-" },
              {
                label: "Status",
                value: <Badge tone={s.active ? "green" : "slate"}>{s.active ? "Ativo" : "Inativo"}</Badge>,
              },
            ]}
            actions={
              canManage ? (
                <div className="flex w-full items-center gap-2">
                  <Link
                    href={`/servicos/${s.id}/editar`}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </Link>
                  <ToggleActiveButton serviceId={s.id} active={s.active} />
                </div>
              ) : undefined
            }
          />
        ))}
        {services.length === 0 && <TableCardEmpty>Nenhum serviço cadastrado ainda.</TableCardEmpty>}
      </TableCardList>
    </div>
  );
}
