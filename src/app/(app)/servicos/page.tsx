import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center justify-between">
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

      <Card className="overflow-hidden">
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
    </div>
  );
}
