import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ArrowRightLeft, FileSignature } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateBR, formatDateTimeBR } from "@/lib/utils";
import { MarkLostButton } from "./mark-lost-button";
import { stageLabels } from "@/lib/lead-labels";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { responsible: true, serviceInterest: true, client: true },
  });

  if (!lead) notFound();

  const convertUrl = `/clientes/novo?${new URLSearchParams({
    fromLead: lead.id,
    name: lead.name,
    whatsapp: lead.whatsapp ?? "",
    phone: lead.phone ?? "",
    instagram: lead.instagram ?? "",
    city: lead.city ?? "",
    type: lead.clientTypeGuess ?? "PF",
  }).toString()}`;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{lead.name}</h1>
            <Badge tone="blue">{stageLabels[lead.stage]}</Badge>
          </div>
          <p className="text-sm text-slate-500">
            Lead criado em {formatDateBR(lead.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          {!lead.clientId && lead.stage !== "PERDIDO" && (
            <MarkLostButton leadId={lead.id} />
          )}
          <Link href={`/leads/${lead.id}/editar`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </Link>
          {lead.clientId ? (
            <>
              <Link href={`/propostas/novo?clientId=${lead.clientId}&leadId=${lead.id}`}>
                <Button variant="outline">
                  <FileSignature className="h-4 w-4" /> Criar proposta
                </Button>
              </Link>
              <Link href={`/clientes/${lead.clientId}`}>
                <Button variant="secondary">Ver cliente</Button>
              </Link>
            </>
          ) : (
            <Link href={convertUrl}>
              <Button variant="secondary">
                <ArrowRightLeft className="h-4 w-4" /> Converter em cliente
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do lead</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="WhatsApp" value={lead.whatsapp} />
          <Field label="Telefone" value={lead.phone} />
          <Field label="Instagram" value={lead.instagram} />
          <Field label="Cidade" value={lead.city} />
          <Field label="Serviço de interesse" value={lead.serviceInterest?.name} />
          <Field label="Origem" value={lead.origin} />
          <Field label="Responsável" value={lead.responsible?.name} />
          <Field
            label="Próximo contato"
            value={formatDateBR(lead.nextContactDate)}
          />
          <Field
            label="Último contato"
            value={formatDateTimeBR(lead.lastContactDate)}
          />
          <div className="col-span-2">
            <Field label="Observações" value={lead.notes} />
          </div>
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
