import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateBR, formatDateTimeBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { mediaContentStatusLabels, mediaContentStatusTone } from "@/lib/lead-labels";
import { MediaContentStatusActions } from "./status-actions";
import { MediaContentApprovalForm } from "./approval-form";
import { MediaContentPublishForm } from "./publish-form";

export default async function MediaContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const content = await prisma.mediaContent.findUnique({
    where: { id },
    include: { client: true, responsible: true, approvedBy: true },
  });

  if (!content) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">
              #{content.number} — {content.title}
            </h1>
            <Badge tone={mediaContentStatusTone[content.status]}>
              {mediaContentStatusLabels[content.status]}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            <Link href={`/clientes/${content.clientId}`} className="hover:underline">
              {displayClientName(content.client)}
            </Link>
          </p>
        </div>
        <Link href={`/midia/${content.id}/editar`}>
          <Button variant="outline">
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        </Link>
      </div>

      <MediaContentStatusActions contentId={content.id} status={content.status} />
      {content.status === "AGUARDANDO_APROVACAO" && (
        <MediaContentApprovalForm contentId={content.id} />
      )}
      {content.status === "APROVADO" && <MediaContentPublishForm contentId={content.id} />}

      <Card>
        <CardHeader>
          <CardTitle>Dados do conteúdo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Tipo" value={content.type} />
          <Field label="Plataforma" value={content.platform} />
          <Field label="Responsável" value={content.responsible?.name} />
          <Field label="Data prevista" value={formatDateBR(content.scheduledDate)} />
          <div className="col-span-2">
            <Field label="Descrição / pauta" value={content.description} />
          </div>
          <div className="col-span-2">
            <Field label="Observações" value={content.notes} />
          </div>
          {content.approvedAt && (
            <>
              <Field
                label={content.status === "REPROVADO" ? "Reprovado por" : "Aprovado por"}
                value={content.approvedBy?.name}
              />
              <Field label="Em" value={formatDateTimeBR(content.approvedAt)} />
              {content.approvalNotes && (
                <div className="col-span-2">
                  <Field label="Observação da aprovação" value={content.approvalNotes} />
                </div>
              )}
            </>
          )}
          {content.publishedAt && (
            <>
              <Field label="Publicado em" value={formatDateTimeBR(content.publishedAt)} />
              {content.link && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Link</p>
                  <a
                    href={content.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {content.link}
                  </a>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-slate-800">{value || "-"}</p>
    </div>
  );
}
