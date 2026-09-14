import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { documentStatusLabels, documentStatusTone } from "@/lib/lead-labels";
import { DocumentStatusActions } from "./status-actions";

export default async function DocumentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const doc = await prisma.generatedDocument.findUnique({
    where: { id },
    include: { client: true, template: true, createdBy: true },
  });

  if (!doc) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{doc.title}</h1>
            <Badge tone={documentStatusTone[doc.status]}>
              {documentStatusLabels[doc.status]}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            <Link href={`/clientes/${doc.clientId}`} className="hover:underline">
              {displayClientName(doc.client)}
            </Link>{" "}
            — documento #{doc.number}, gerado em {formatDateBR(doc.createdAt)} a partir de{" "}
            {doc.template.name} (v{doc.template.version})
          </p>
        </div>
        <a href={`/documentos/${doc.id}/pdf`} target="_blank" rel="noreferrer">
          <Button variant="outline">
            <Download className="h-4 w-4" /> PDF
          </Button>
        </a>
      </div>

      <DocumentStatusActions documentId={doc.id} status={doc.status} />

      <Card>
        <CardHeader>
          <CardTitle>Conteúdo do documento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800">
            {doc.renderedContent}
          </div>
        </CardContent>
      </Card>

      {doc.createdBy && (
        <p className="text-xs text-slate-400">Gerado por {doc.createdBy.name}.</p>
      )}
    </div>
  );
}
