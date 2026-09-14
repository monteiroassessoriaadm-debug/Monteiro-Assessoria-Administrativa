import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { documentStatusLabels, documentStatusTone } from "@/lib/lead-labels";

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const documents = await prisma.generatedDocument.findMany({
    where: status ? { status: status as never } : undefined,
    include: { client: true, template: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Documentos</h1>
          <p className="text-sm text-slate-500">
            Contratos e demais documentos gerados a partir dos modelos cadastrados.
          </p>
        </div>
        <Link href="/documentos/novo">
          <Button>
            <Plus className="h-4 w-4" /> Gerar documento
          </Button>
        </Link>
      </div>

      <form className="flex gap-3">
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">Todos os status</option>
          {Object.entries(documentStatusLabels).map(([value, label]) => (
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
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Gerado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link href={`/documentos/${d.id}`} className="hover:underline">
                    #{d.number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{d.title}</td>
                <td className="px-4 py-3 text-slate-600">{displayClientName(d.client)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {d.template.name} (v{d.template.version})
                </td>
                <td className="px-4 py-3">
                  <Badge tone={documentStatusTone[d.status]}>
                    {documentStatusLabels[d.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDateBR(d.createdAt)}</td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Nenhum documento gerado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
