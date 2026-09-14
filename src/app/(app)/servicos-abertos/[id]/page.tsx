import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { serviceInstanceStatusLabels, serviceInstanceStatusTone } from "@/lib/lead-labels";
import { Checklist } from "./checklist";
import { ServiceInstanceStatusActions } from "./status-actions";

export default async function ServicoAbertoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const instance = await prisma.serviceInstance.findUnique({
    where: { id },
    include: {
      client: true,
      responsible: true,
      checklistItems: { orderBy: { order: "asc" } },
      quote: true,
      proposal: true,
    },
  });

  if (!instance) notFound();

  const doneCount = instance.checklistItems.filter((i) => i.done).length;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">
              #{instance.number} — {instance.title}
            </h1>
            <Badge tone={serviceInstanceStatusTone[instance.status]}>
              {serviceInstanceStatusLabels[instance.status]}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            <Link href={`/clientes/${instance.clientId}`} className="hover:underline">
              {displayClientName(instance.client)}
            </Link>
            {instance.quote && (
              <>
                {" "}
                — a partir do{" "}
                <Link href={`/orcamentos/${instance.quote.id}`} className="hover:underline">
                  orçamento #{instance.quote.number}
                </Link>
              </>
            )}
            {instance.proposal && (
              <>
                {" "}
                — a partir da{" "}
                <Link href={`/propostas/${instance.proposal.id}`} className="hover:underline">
                  proposta #{instance.proposal.number}
                </Link>
              </>
            )}
          </p>
        </div>
        <Link href={`/servicos-abertos/${instance.id}/editar`}>
          <Button variant="outline">
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        </Link>
      </div>

      <ServiceInstanceStatusActions instanceId={instance.id} status={instance.status} />

      <Card>
        <CardHeader>
          <CardTitle>
            Checklist {instance.checklistItems.length > 0 && `(${doneCount}/${instance.checklistItems.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Checklist items={instance.checklistItems} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados do serviço</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Responsável" value={instance.responsible?.name} />
          <Field
            label="Valor"
            value={instance.price ? formatCurrencyBRL(instance.price.toString()) : null}
          />
          <Field label="Prazo" value={formatDateBR(instance.dueDate)} />
          <Field label="Entregue em" value={formatDateBR(instance.deliveredAt)} />
          <div className="col-span-2">
            <Field label="Observações" value={instance.notes} />
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
