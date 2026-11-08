import Link from "next/link";
import { Plus, Kanban } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { ActiveFilter, statusLabel, statusList } from "@/components/ui/active-filter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCard, TableCardList, TableCardEmpty } from "@/components/ui/table-card";
import { formatDateBR } from "@/lib/utils";
import { stageLabels, temperatureTone, temperatureLabel } from "@/lib/lead-labels";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; temperature?: string }>;
}) {
  const { stage, temperature } = await searchParams;
  const stages = statusList(stage);

  const leads = await prisma.lead.findMany({
    where: {
      ...(stages.length === 1
        ? { stage: stages[0] as never }
        : stages.length > 1
          ? { stage: { in: stages as never[] } }
          : {}),
      ...(temperature ? { temperature: temperature as never } : {}),
    },
    include: { responsible: true, serviceInterest: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500">
            Prospecção → Atendimento → Qualificação.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/funil">
            <Button variant="outline">
              <Kanban className="h-4 w-4" /> Ver funil
            </Button>
          </Link>
          <Link href="/leads/novo">
            <Button>
              <Plus className="h-4 w-4" /> Novo lead
            </Button>
          </Link>
        </div>
      </div>

      <FilterDrawer>
      <form className="flex flex-wrap gap-3">
        <select
          name="stage"
          defaultValue={stage ?? ""}
          className="h-11 min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-base md:h-10 md:text-sm"
        >
          <option value="">Todas as etapas</option>
          {Object.entries(stageLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="temperature"
          defaultValue={temperature ?? ""}
          className="h-11 min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-base md:h-10 md:text-sm"
        >
          <option value="">Todas as temperaturas</option>
          <option value="FRIO">🔴 Frio</option>
          <option value="MORNO">🟡 Morno</option>
          <option value="QUENTE">🟢 Quente</option>
        </select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>
      </FilterDrawer>

      <ActiveFilter
        label={
          [
            stages.length ? statusLabel(stages, stageLabels) : null,
            temperature === "QUENTE" ? "leads quentes" : temperature === "MORNO" ? "leads mornos" : temperature === "FRIO" ? "leads frios" : null,
          ]
            .filter(Boolean)
            .join(" · ") || null
        }
        clearHref="/leads"
      />

      <Card className="table-scroll hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Serviço de interesse</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Temperatura</th>
              <th className="px-4 py-3">Etapa</th>
              <th className="px-4 py-3">Próximo contato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {lead.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {lead.whatsapp ?? lead.phone ?? "-"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {lead.serviceInterest?.name ?? "-"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {lead.responsible?.name ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={temperatureTone[lead.temperature]}>
                    {temperatureLabel[lead.temperature]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {stageLabels[lead.stage]}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDateBR(lead.nextContactDate)}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <TableCardList>
        {leads.map((lead) => (
          <TableCard
            key={lead.id}
            href={`/leads/${lead.id}`}
            title={lead.name}
            subtitle={lead.whatsapp ?? lead.phone ?? undefined}
            fields={[
              { label: "Serviço de interesse", value: lead.serviceInterest?.name ?? "-" },
              { label: "Responsável", value: lead.responsible?.name ?? "-" },
              {
                label: "Temperatura",
                value: (
                  <Badge tone={temperatureTone[lead.temperature]}>
                    {temperatureLabel[lead.temperature]}
                  </Badge>
                ),
              },
              { label: "Etapa", value: stageLabels[lead.stage] },
              { label: "Próximo contato", value: formatDateBR(lead.nextContactDate) },
            ]}
          />
        ))}
        {leads.length === 0 && <TableCardEmpty>Nenhum lead encontrado.</TableCardEmpty>}
      </TableCardList>
    </div>
  );
}
