import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateBR } from "@/lib/utils";

const stageLabels: Record<string, string> = {
  NOVO_LEAD: "Novo lead",
  PRIMEIRO_CONTATO: "Primeiro contato",
  EM_ATENDIMENTO: "Em atendimento",
  INTERESSADO: "Interessado",
  ORCAMENTO_ENVIADO: "Orçamento enviado",
  NEGOCIACAO: "Negociação",
  CONTRATADO: "Contratado",
  PERDIDO: "Perdido",
};

const temperatureTone: Record<string, "red" | "yellow" | "green"> = {
  FRIO: "red",
  MORNO: "yellow",
  QUENTE: "green",
};

const temperatureLabel: Record<string, string> = {
  FRIO: "🔴 Frio",
  MORNO: "🟡 Morno",
  QUENTE: "🟢 Quente",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; temperature?: string }>;
}) {
  const { stage, temperature } = await searchParams;

  const leads = await prisma.lead.findMany({
    where: {
      ...(stage ? { stage: stage as never } : {}),
      ...(temperature ? { temperature: temperature as never } : {}),
    },
    include: { responsible: true, serviceInterest: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500">
            Prospecção → Atendimento → Qualificação.
          </p>
        </div>
        <Link href="/leads/novo">
          <Button>
            <Plus className="h-4 w-4" /> Novo lead
          </Button>
        </Link>
      </div>

      <form className="flex gap-3">
        <select
          name="stage"
          defaultValue={stage ?? ""}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
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
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
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

      <Card className="overflow-hidden">
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
    </div>
  );
}
