import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Download, FileStack } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyBRL, formatDateBR, formatDateTimeBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";
import { quoteStatusLabels, quoteStatusTone } from "@/lib/lead-labels";
import { QuoteStatusActions } from "./status-actions";

export default async function OrcamentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { client: true, items: true, createdBy: true },
  });

  if (!quote) notFound();

  const total = quote.items.reduce(
    (sum, i) => sum + i.quantity * Number(i.unitPrice),
    0,
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">
              Orçamento #{quote.number}
            </h1>
            <Badge tone={quoteStatusTone[quote.status]}>
              {quoteStatusLabels[quote.status]}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            <Link href={`/clientes/${quote.clientId}`} className="hover:underline">
              {displayClientName(quote.client)}
            </Link>{" "}
            — criado em {formatDateBR(quote.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/orcamentos/${quote.id}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <Download className="h-4 w-4" /> PDF
            </Button>
          </a>
          <Link href={`/orcamentos/${quote.id}/editar`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </Link>
          {quote.status === "APROVADO" && (
            <Link href={`/documentos/novo?clientId=${quote.clientId}`}>
              <Button variant="secondary">
                <FileStack className="h-4 w-4" /> Gerar contrato
              </Button>
            </Link>
          )}
        </div>
      </div>

      <QuoteStatusActions quoteId={quote.id} status={quote.status} />

      <Card>
        <CardHeader>
          <CardTitle>Serviços</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-2">Descrição</th>
                <th className="px-5 py-2">Qtd.</th>
                <th className="px-5 py-2">Valor unit.</th>
                <th className="px-5 py-2">Prazo</th>
                <th className="px-5 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quote.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-2">{item.description}</td>
                  <td className="px-5 py-2">{item.quantity}</td>
                  <td className="px-5 py-2">{formatCurrencyBRL(item.unitPrice.toString())}</td>
                  <td className="px-5 py-2">
                    {item.termDays ? `${item.termDays} dias` : "-"}
                  </td>
                  <td className="px-5 py-2 text-right">
                    {formatCurrencyBRL(item.quantity * Number(item.unitPrice))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 font-semibold text-slate-900">
                <td className="px-5 py-3" colSpan={4}>
                  Total
                </td>
                <td className="px-5 py-3 text-right">{formatCurrencyBRL(total)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Condições</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Forma de pagamento" value={quote.paymentTerms} />
          <Field label="Validade" value={formatDateBR(quote.validUntil)} />
          <Field label="Enviado em" value={formatDateTimeBR(quote.sentAt)} />
          <Field label="Respondido em" value={formatDateTimeBR(quote.respondedAt)} />
          <Field label="Criado por" value={quote.createdBy?.name} />
          <div className="col-span-2">
            <Field label="Observações" value={quote.notes} />
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
