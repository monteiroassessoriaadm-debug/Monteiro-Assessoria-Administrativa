import Link from "next/link";
import { FileDown, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { contractKindLabels } from "@/lib/lead-labels";
import { parseContractFields } from "@/lib/contract-render";
import { formatDateBR } from "@/lib/utils";
import { TemplateButtons } from "./template-buttons";

export default async function ModelosContratoPage() {
  await requireRole(Role.ADMIN);

  const templates = await prisma.contractTemplate.findMany({
    orderBy: [{ version: "desc" }],
    include: { _count: { select: { contracts: true } } },
  });

  // Um cartão por modelo, mostrando a versão ativa (ou a mais recente).
  const groups = new Map<string, typeof templates>();
  for (const t of templates) groups.set(t.baseTemplateId, [...(groups.get(t.baseTemplateId) ?? []), t]);
  const cards = [...groups.values()]
    .map((versions) => ({ current: versions.find((v) => v.active) ?? versions[0], versions }))
    .sort((a, b) => Number(b.current.active) - Number(a.current.active) || a.current.kind.localeCompare(b.current.kind) || a.current.name.localeCompare(b.current.name));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Modelos de contrato</h1>
          <p className="text-sm text-slate-500">
            Editar um modelo cria uma versão nova; contratos já gerados ficam com a versão da época.
          </p>
        </div>
        <Link href="/juridico/modelos/novo">
          <Button>
            <Plus className="h-4 w-4" /> Novo modelo
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {cards.map(({ current: t, versions }) => {
          const used = versions.reduce((s, v) => s + v._count.contracts, 0);
          return (
            <Card key={t.baseTemplateId} className="flex flex-col p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">
                    {[t.category, t.slug ? `chave: ${t.slug}` : null, `v${t.version}`, `atualizado em ${formatDateBR(t.createdAt)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Badge tone={t.kind === "CONTRATO" ? "blue" : "purple"}>{contractKindLabels[t.kind]}</Badge>
                  <Badge tone={t.active ? "green" : "slate"}>{t.active ? "Ativo" : "Inativo"}</Badge>
                </div>
              </div>
              {t.description && <p className="mt-2 text-sm text-slate-600">{t.description}</p>}
              <p className="mt-2 text-xs text-slate-500">
                {parseContractFields(t.fieldsSchema).length} campos · usado em {used} {used === 1 ? "contrato" : "contratos"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/juridico/modelos/${t.id}/editar`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                </Link>
                <a href={`/juridico/modelos/${t.id}/pdf`} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    <FileDown className="h-4 w-4" /> Prévia PF
                  </Button>
                </a>
                {t.kind === "CONTRATO" && (
                  <a href={`/juridico/modelos/${t.id}/pdf?tipo=PJ`} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">
                      <FileDown className="h-4 w-4" /> Prévia PJ
                    </Button>
                  </a>
                )}
                <TemplateButtons templateId={t.id} active={t.active} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
