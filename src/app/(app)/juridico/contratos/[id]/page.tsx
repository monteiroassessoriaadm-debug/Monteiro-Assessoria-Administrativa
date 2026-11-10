import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyBRL, formatDateBR, formatDateTimeBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { contractStatusLabels, contractStatusTone, receivableStatusLabels, receivableStatusTone } from "@/lib/lead-labels";
import { CONTRACT_TRANSITIONS, refreshContractStatuses } from "@/lib/contracts";
import { contractNextDate, contractValue, contractWhatsAppMessage } from "@/lib/contract-display";
import { ContractStatusActions } from "./status-actions";
import { CopyTextButton, PdfButtons } from "./pdf-buttons";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-sm text-slate-500 sm:w-44">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-slate-900">{children}</dd>
    </div>
  );
}

export default async function ContratoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await refreshContractStatuses();

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      client: true,
      template: true,
      quote: true,
      service: true,
      serviceInstance: true,
      createdBy: true,
      receivables: { orderBy: { dueDate: "asc" } },
      versions: { orderBy: { version: "desc" }, include: { createdBy: true } },
      statusChanges: { orderBy: { createdAt: "desc" }, include: { createdBy: true } },
    },
  });
  if (!contract) notFound();

  const clientName = displayClientName(contract.client);
  const editable = contract.status === "RASCUNHO" || contract.status === "ENVIADO";
  const pdfHref = `/juridico/contratos/${contract.id}/pdf`;
  const message = contractWhatsAppMessage({ clientName, code: contract.code, title: contract.title });
  const quoteReceivables = contract.quoteId
    ? await prisma.receivable.count({ where: { quoteId: contract.quoteId, contractId: null } })
    : 0;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{contract.code}</h1>
            <Badge tone={contractStatusTone[contract.status]}>{contractStatusLabels[contract.status]}</Badge>
          </div>
          <p className="break-words text-sm text-slate-500">
            {contract.title} —{" "}
            <Link href={`/clientes/${contract.clientId}`} className="hover:underline">
              {clientName}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PdfButtons href={pdfHref} filename={`${contract.code}.pdf`} />
          {editable && (
            <Link href={`/juridico/contratos/${contract.id}/editar`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4" /> Editar
              </Button>
            </Link>
          )}
        </div>
      </div>

      <ContractStatusActions contractId={contract.id} status={contract.status} allowed={CONTRACT_TRANSITIONS[contract.status]} />

      {contract.kind === "CONTRATO" && (contract.status === "RASCUNHO" || contract.status === "ENVIADO") && (
        <Card>
          <CardHeader>
            <CardTitle>Enviar para assinatura (gov.br)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Compartilhe o PDF com o cliente e mande a mensagem abaixo. Depois de enviar, marque como enviado; quando o
              PDF assinado voltar, marque como assinado.
            </p>
            <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 font-sans text-sm text-slate-800">{message}</pre>
            <CopyTextButton text={message} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dados do contrato</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-slate-100">
            <Row label="Cliente">
              <Link href={`/clientes/${contract.clientId}`} className="hover:underline">
                {clientName}
              </Link>
            </Row>
            <Row label="Modelo">
              {contract.template.name} (v{contract.template.version})
            </Row>
            <Row label="Valor">{contractValue(contract)}</Row>
            {contract.paymentTerms && <Row label="Pagamento">{contract.paymentTerms}</Row>}
            <Row label="Início">{formatDateBR(contract.startDate)}</Row>
            <Row label="Vencimento / reajuste">{contractNextDate(contract)}</Row>
            <Row label="Orçamento">
              {contract.quote ? (
                <Link href={`/orcamentos/${contract.quote.id}`} className="hover:underline">
                  Nº {contract.quote.number}
                </Link>
              ) : (
                "-"
              )}
            </Row>
            <Row label="Serviço">{contract.service?.name ?? "-"}</Row>
            <Row label="Serviço em andamento">
              {contract.serviceInstance ? (
                <Link href={`/servicos-abertos/${contract.serviceInstance.id}`} className="hover:underline">
                  #{contract.serviceInstance.number} — {contract.serviceInstance.title}
                </Link>
              ) : (
                "-"
              )}
            </Row>
            <Row label="Enviado em">{contract.sentAt ? formatDateTimeBR(contract.sentAt) : "-"}</Row>
            <Row label="Assinado em">
              {contract.signedAt ? `${formatDateBR(contract.signedAt)} (${contract.signatureMethod ?? "-"})` : "-"}
            </Row>
            {contract.endedAt && (
              <Row label="Encerrado em">
                {formatDateBR(contract.endedAt)}
                {contract.endReason ? ` — ${contract.endReason}` : ""}
              </Row>
            )}
            {contract.notes && <Row label="Observações">{contract.notes}</Row>}
            <Row label="Gerado">
              {formatDateTimeBR(contract.createdAt)}
              {contract.createdBy ? ` por ${contract.createdBy.name}` : ""}
            </Row>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contas a receber</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {contract.receivables.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nenhuma conta a receber ligada.
              {quoteReceivables > 0 && " As do orçamento são ligadas quando o contrato for assinado."}
            </p>
          ) : (
            contract.receivables.map((r) => (
              <Link
                key={r.id}
                href={`/financeiro/receber/${r.id}/editar`}
                className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50 md:min-h-0"
              >
                <span className="min-w-0 break-words">
                  #{r.number} {r.description} — {formatCurrencyBRL(Number(r.amount))}
                  {r.dueDate ? ` · vence ${formatDateBR(r.dueDate)}` : ""}
                </span>
                <Badge tone={receivableStatusTone[r.status]}>{receivableStatusLabels[r.status]}</Badge>
              </Link>
            ))
          )}
          <Link href={`/financeiro/receber/novo?clientId=${contract.clientId}`}>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4" /> Nova conta a receber
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Texto do contrato (versão {contract.currentVersion})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-800">
            {contract.renderedContent}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Versões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contract.versions.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <span className="min-w-0 break-words">
                  <strong>v{v.version}</strong> · {formatDateTimeBR(v.createdAt)}
                  {v.createdBy ? ` · ${v.createdBy.name}` : ""}
                  {v.reason ? <span className="block text-xs text-slate-500">{v.reason}</span> : null}
                </span>
                <a href={`${pdfHref}?versao=${v.version}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 underline md:min-h-0">
                  PDF
                </a>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contract.statusChanges.map((s) => (
              <div key={s.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <p>
                  {s.fromStatus ? `${contractStatusLabels[s.fromStatus]} → ` : ""}
                  <strong>{contractStatusLabels[s.toStatus]}</strong>
                </p>
                <p className="text-xs text-slate-500">
                  {formatDateTimeBR(s.createdAt)}
                  {s.createdBy ? ` · ${s.createdBy.name}` : ""}
                </p>
                {s.note && <p className="mt-1 break-words text-xs text-slate-600">{s.note}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
