import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ArrowRightLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateBR } from "@/lib/utils";

export default async function ProspeccaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const prospect = await prisma.prospectingEntry.findUnique({
    where: { id },
    include: { responsible: true, potentialService: true, convertedLead: true },
  });

  if (!prospect) notFound();

  const convertUrl = `/leads/novo?${new URLSearchParams({
    fromProspect: prospect.id,
    name: prospect.name,
    whatsapp: prospect.whatsapp ?? "",
    instagram: prospect.instagram ?? "",
    city: prospect.city ?? "",
    serviceInterestId: prospect.potentialServiceId ?? "",
  }).toString()}`;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{prospect.name}</h1>
            {prospect.convertedLeadId ? (
              <Badge tone="green">Convertido em lead</Badge>
            ) : (
              <Badge tone="slate">Em prospecção</Badge>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Registrado em {formatDateBR(prospect.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/prospeccao/${prospect.id}/editar`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </Link>
          {prospect.convertedLeadId ? (
            <Link href={`/leads/${prospect.convertedLeadId}`}>
              <Button variant="secondary">Ver lead</Button>
            </Link>
          ) : (
            <Link href={convertUrl}>
              <Button variant="secondary">
                <ArrowRightLeft className="h-4 w-4" /> Converter em lead
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Segmento" value={prospect.segment} />
          <Field label="Cidade" value={prospect.city} />
          <Field label="Contato" value={prospect.contactName} />
          <Field label="WhatsApp" value={prospect.whatsapp} />
          <Field label="Instagram" value={prospect.instagram} />
          <Field label="Serviço potencial" value={prospect.potentialService?.name} />
          <Field label="Responsável" value={prospect.responsible?.name} />
          <Field label="Data do contato" value={formatDateBR(prospect.contactDate)} />
          <Field label="Próximo contato" value={formatDateBR(prospect.nextContactDate)} />
          <div className="col-span-2">
            <Field label="Resultado do contato" value={prospect.result} />
          </div>
          <div className="col-span-2">
            <Field label="Observações" value={prospect.notes} />
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
