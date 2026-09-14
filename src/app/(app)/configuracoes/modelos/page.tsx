import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleTemplateActiveButton } from "./toggle-active-button";
import { DuplicateTemplateButton } from "./duplicate-button";

export default async function ModelosPage() {
  await requireRole(Role.ADMIN);

  const templates = await prisma.documentTemplate.findMany({
    orderBy: [{ baseTemplateId: "asc" }, { version: "desc" }],
  });

  const groups = new Map<string, typeof templates>();
  for (const t of templates) {
    const list = groups.get(t.baseTemplateId) ?? [];
    list.push(t);
    groups.set(t.baseTemplateId, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Modelos de documentos</h1>
          <p className="text-sm text-slate-500">
            O sistema não cria cláusulas jurídicas — o conteúdo é definido aqui pela
            administração da Monteiro.
          </p>
        </div>
        <Link href="/configuracoes/modelos/novo">
          <Button>
            <Plus className="h-4 w-4" /> Novo modelo
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {[...groups.entries()].map(([baseId, versions]) => {
          const latest = versions[0];
          return (
            <Card key={baseId} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{latest.name}</p>
                  <p className="text-xs text-slate-500">{latest.category ?? "Sem categoria"}</p>
                </div>
                <Badge tone={latest.active ? "green" : "slate"}>
                  {latest.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {versions.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-5 py-2 text-slate-600">Versão {v.version}</td>
                      <td className="px-5 py-2">
                        <Badge tone={v.active ? "green" : "slate"}>
                          {v.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-5 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/configuracoes/modelos/${v.id}/editar`}>
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <DuplicateTemplateButton templateId={v.id} />
                          <ToggleTemplateActiveButton templateId={v.id} active={v.active} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          );
        })}
        {groups.size === 0 && (
          <Card className="p-10 text-center text-sm text-slate-400">
            Nenhum modelo cadastrado ainda.
          </Card>
        )}
      </div>
    </div>
  );
}
