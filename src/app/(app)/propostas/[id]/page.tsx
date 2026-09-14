import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyBRL, formatDateBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { proposalStatusLabels, proposalStatusTone } from "@/lib/lead-labels";
import { ProposalStatusActions } from "./status-actions";

export default async function PropostaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: { client: true, service: true, createdBy: true },
  });

  if (!proposal) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">
              Proposta #{proposal.number}
            </h1>
            <Badge tone={proposalStatusTone[proposal.status]}>
              {proposalStatusLabels[proposal.status]}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            <Link href={`/clientes/${proposal.clientId}`} className="hover:underline">
              {displayClientName(proposal.client)}
            </Link>{" "}
            — criada em {formatDateBR(proposal.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/propostas/${proposal.id}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <Download className="h-4 w-4" /> PDF
            </Button>
          </a>
          <Link href={`/propostas/${proposal.id}/editar`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </Link>
        </div>
      </div>

      <ProposalStatusActions proposalId={proposal.id} status={proposal.status} />

      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico e solução</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Field label="Serviço" value={proposal.service?.name} />
          <Field label="Problema / demanda" value={proposal.demand} />
          <Field label="Solução proposta" value={proposal.solution} />
          <Field label="Escopo" value={proposal.scope} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Investimento e condições</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field
            label="Investimento"
            value={proposal.investment ? formatCurrencyBRL(proposal.investment.toString()) : null}
          />
          <Field label="Prazo" value={proposal.termText} />
          <Field label="Forma de pagamento" value={proposal.paymentTerms} />
          <Field label="Validade" value={formatDateBR(proposal.validUntil)} />
          <Field label="Criada por" value={proposal.createdBy?.name} />
          <div className="col-span-2">
            <Field label="Observações" value={proposal.notes} />
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
      <p className="whitespace-pre-wrap text-slate-800">{value || "-"}</p>
    </div>
  );
}
