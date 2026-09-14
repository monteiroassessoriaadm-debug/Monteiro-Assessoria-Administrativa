import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatDateBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { mediaContentStatusLabels, mediaContentStatusTone } from "@/lib/lead-labels";

export default async function MidiaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; responsibleId?: string }>;
}) {
  const { status, responsibleId } = await searchParams;

  const [contents, users] = await Promise.all([
    prisma.mediaContent.findMany({
      where: {
        status: (status as never) || undefined,
        responsibleId: responsibleId || undefined,
      },
      include: { client: true, responsible: true },
      orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeStatuses = ["IDEIA", "EM_PRODUCAO", "AGUARDANDO_APROVACAO", "APROVADO"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Calendário de conteúdo</h1>
          <p className="text-sm text-slate-500">
            Pauta, produção, aprovação e publicação de conteúdo por cliente.
          </p>
        </div>
        <Link href="/midia/novo">
          <Button>
            <Plus className="h-4 w-4" /> Novo conteúdo
          </Button>
        </Link>
      </div>

      <form className="flex flex-wrap gap-3">
        <Select name="status" defaultValue={status ?? ""} className="w-56">
          <option value="">Todos os status</option>
          {Object.entries(mediaContentStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select name="responsibleId" defaultValue={responsibleId ?? ""} className="w-56">
          <option value="">Todos os responsáveis</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
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
              <th className="px-4 py-3">Data prevista</th>
              <th className="px-4 py-3">Conteúdo</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Tipo / plataforma</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contents.map((c) => {
              const overdue =
                c.scheduledDate && c.scheduledDate < today && activeStatuses.includes(c.status);
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className={`px-4 py-3 ${overdue ? "font-medium text-red-600" : "text-slate-600"}`}>
                    {formatDateBR(c.scheduledDate)}
                    {overdue ? " (atrasado)" : ""}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/midia/${c.id}`} className="hover:underline">
                      #{c.number} — {c.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{displayClientName(c.client)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {[c.type, c.platform].filter(Boolean).join(" · ") || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.responsible?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={mediaContentStatusTone[c.status]}>
                      {mediaContentStatusLabels[c.status]}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {contents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Nenhum conteúdo cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
