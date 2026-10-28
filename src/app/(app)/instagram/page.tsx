import Link from "next/link";
import { Plus, Pencil, Users, TrendingUp, Heart, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard, SectionTitle } from "@/components/dashboard/stat-card";
import { MonthlyLineChart } from "@/components/dashboard/monthly-line-chart";
import { formatDateBR, formatCompactNumber } from "@/lib/utils";
import { DeleteMetricButton } from "./delete-metric-button";

export default async function InstagramPage() {
  const metrics = await prisma.instagramMetric.findMany({
    orderBy: { date: "asc" },
  });

  const latest = metrics.at(-1);
  const previous = metrics.length > 1 ? metrics[metrics.length - 2] : null;
  const followerGrowth = latest && previous ? latest.followers - previous.followers : null;

  const totalLikes30 = metrics.reduce((sum, m) => sum + m.likes, 0);
  const totalComments30 = metrics.reduce((sum, m) => sum + m.comments, 0);
  const totalShares30 = metrics.reduce((sum, m) => sum + m.shares, 0);

  const followersChartData = metrics.map((m) => ({
    label: formatDateBR(m.date),
    seguidores: m.followers,
  }));
  const interactionsChartData = metrics.map((m) => ({
    label: formatDateBR(m.date),
    curtidas: m.likes,
    comentarios: m.comments,
  }));
  const reachChartData = metrics.map((m) => ({
    label: formatDateBR(m.date),
    alcance: m.reach,
    visitas: m.profileVisits,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Instagram</h1>
          <p className="text-sm text-slate-500">
            Acompanhe o crescimento do perfil para orientar as estratégias de conteúdo.
          </p>
        </div>
        <Link href="/instagram/novo">
          <Button>
            <Plus className="h-4 w-4" /> Novo registro
          </Button>
        </Link>
      </div>

      <section>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Seguidores (atual)"
            value={latest ? formatCompactNumber(latest.followers) : "-"}
            icon={Users}
            tone="blue"
          />
          <StatCard
            label="Crescimento (último registro)"
            value={
              followerGrowth === null
                ? "-"
                : `${followerGrowth >= 0 ? "+" : ""}${followerGrowth}`
            }
            icon={TrendingUp}
            tone={followerGrowth !== null && followerGrowth < 0 ? "red" : "green"}
          />
          <StatCard
            label="Curtidas + comentários (acumulado)"
            value={formatCompactNumber(totalLikes30 + totalComments30 + totalShares30)}
            icon={Heart}
            tone="amber"
          />
          <StatCard
            label="Contas alcançadas (último registro)"
            value={latest ? formatCompactNumber(latest.reach) : "-"}
            icon={Eye}
            tone="slate"
          />
        </div>
      </section>

      {metrics.length > 1 && (
        <section>
          <SectionTitle>Evolução</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <p className="mb-2 text-sm font-medium text-slate-700">Seguidores</p>
              <MonthlyLineChart
                data={followersChartData}
                series={[{ key: "seguidores", label: "Seguidores", color: "#2a78d6" }]}
                format="number"
              />
            </Card>
            <Card className="p-4">
              <p className="mb-2 text-sm font-medium text-slate-700">Interações por registro</p>
              <MonthlyLineChart
                data={interactionsChartData}
                series={[
                  { key: "curtidas", label: "Curtidas", color: "#d6a62a" },
                  { key: "comentarios", label: "Comentários", color: "#6250d6", dashed: true },
                ]}
                format="number"
              />
            </Card>
            <Card className="p-4">
              <p className="mb-2 text-sm font-medium text-slate-700">Alcance e visitas ao perfil</p>
              <MonthlyLineChart
                data={reachChartData}
                series={[
                  { key: "alcance", label: "Contas alcançadas", color: "#008300" },
                  { key: "visitas", label: "Visitas ao perfil", color: "#e34948", dashed: true },
                ]}
                format="number"
              />
            </Card>
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Histórico de registros</SectionTitle>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Seguidores</th>
                <th className="px-4 py-3">Curtidas</th>
                <th className="px-4 py-3">Comentários</th>
                <th className="px-4 py-3">Alcance</th>
                <th className="px-4 py-3">Observações</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...metrics].reverse().map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {formatDateBR(m.date)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatCompactNumber(m.followers)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatCompactNumber(m.likes)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatCompactNumber(m.comments)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatCompactNumber(m.reach)}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-500">
                    {m.notes ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/instagram/${m.id}/editar`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <DeleteMetricButton metricId={m.id} />
                    </div>
                  </td>
                </tr>
              ))}
              {metrics.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Nenhum registro ainda. Adicione o primeiro para começar a acompanhar o
                    crescimento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
