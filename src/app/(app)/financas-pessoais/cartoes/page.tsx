import { prisma } from "@/lib/prisma";
import { requirePfOwner } from "@/lib/pf/access";
import * as pf from "@/lib/pf/service";
import { monthLabel } from "@/lib/pf/calc";
import { moneyToInput } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PfForm } from "@/components/pf/pf-form";
import { Empty, Money, ProgressBar, dayBR } from "@/components/pf/pf-ui";
import { brDayKey } from "@/lib/br-time";
import { formatCurrencyBRL } from "@/lib/utils";
import { payInvoiceAction, saveCardAction } from "../actions";

export const dynamic = "force-dynamic";

function CardFields({ card }: { card?: { name: string; limit: number; closingDay: number; dueDay: number } }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <div>
        <Label>Nome</Label>
        <Input name="name" defaultValue={card?.name} placeholder="Ex.: Nubank" required />
      </div>
      <div>
        <Label>Limite (R$)</Label>
        <Input name="limit" inputMode="decimal" defaultValue={card ? moneyToInput(card.limit) : ""} required />
      </div>
      <div>
        <Label>Dia de fechamento</Label>
        <Input name="closingDay" type="number" min={1} max={31} defaultValue={card?.closingDay} required />
      </div>
      <div>
        <Label>Dia de vencimento</Label>
        <Input name="dueDay" type="number" min={1} max={31} defaultValue={card?.dueDay} required />
      </div>
    </div>
  );
}

export default async function CartoesPage() {
  await requirePfOwner();
  const [cards, accounts, installments] = await Promise.all([
    pf.getCardsOverview(),
    prisma.pfAccount.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    prisma.pfTransaction.findMany({
      where: { cardId: { not: null }, installmentTotal: { gt: 1 }, invoiceMonth: { gte: pf.currentMonth() } },
      orderBy: [{ invoiceMonth: "asc" }],
      select: { id: true, cardId: true, description: true, amount: true, date: true, installmentNumber: true, installmentTotal: true, invoiceMonth: true, installmentGroupId: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      {cards.length === 0 && <Empty>Nenhum cartão cadastrado.</Empty>}
      {cards.map((c) => {
        const usedPct = c.limit > 0 ? (c.used / c.limit) * 100 : 0;
        // Uma linha por compra parcelada: a próxima parcela que ainda vai cair.
        const nextByGroup = new Map<string, (typeof installments)[number]>();
        for (const t of installments) if (t.cardId === c.id && t.installmentGroupId && !nextByGroup.has(t.installmentGroupId)) nextByGroup.set(t.installmentGroupId, t);
        return (
          <Card key={c.id}>
            <CardHeader className="flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                Cartão {c.name} {!c.active && <Badge>inativo</Badge>}
              </CardTitle>
              <span className="text-xs text-slate-500">
                fecha dia {c.closingDay} · vence dia {c.dueDay}
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Fatura atual ({monthLabel(c.currentInvoiceMonth)})</p>
                  <Money value={c.currentInvoice} className="text-lg font-bold text-slate-900" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Limite usado</p>
                  <Money value={c.used} className="text-lg font-bold text-slate-900" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Disponível</p>
                  <Money value={c.available} signed className="text-lg font-bold" />
                </div>
              </div>
              <ProgressBar value={usedPct} tone={usedPct > 100 ? "red" : usedPct >= 80 ? "yellow" : "green"} />

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Faturas</p>
                {c.invoices.length === 0 && <p className="text-sm text-slate-400">Nenhuma compra lançada neste cartão.</p>}
                {c.invoices.map((i) => (
                  <div key={i.month} className="flex flex-col gap-2 rounded-lg border border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm">
                      <p className="flex items-center gap-2 font-medium text-slate-900">
                        {monthLabel(i.month)}
                        <Badge tone={i.situation === "fechada" ? "red" : i.situation === "atual" ? "blue" : i.situation === "paga" ? "green" : "slate"}>{i.situation}</Badge>
                      </p>
                      <p className="text-xs text-slate-500">
                        vence {dayBR(i.dueDate)} · total {formatCurrencyBRL(i.total)}
                        {i.paid > 0 ? ` · pago ${formatCurrencyBRL(i.paid)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Money value={i.open} className="font-semibold text-slate-900" />
                      {i.open > 0 && accounts.length > 0 && (
                        <PfForm action={payInvoiceAction} compact submitLabel="Pagar" pendingLabel="..." variant="secondary">
                          <input type="hidden" name="cardId" value={c.id} />
                          <input type="hidden" name="invoiceMonth" value={i.month} />
                          <Input name="amount" inputMode="decimal" defaultValue={moneyToInput(i.open)} className="w-28" aria-label="Valor pago" />
                          <Select name="accountId" className="w-auto" aria-label="Conta">
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </Select>
                        </PfForm>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {nextByGroup.size > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Compras parceladas</p>
                  {[...nextByGroup.values()].map((t) => (
                    <p key={t.id} className="flex justify-between gap-2 text-sm">
                      <span className="text-slate-700">
                        {t.description.replace(/ \(\d+\/\d+\)$/, "")} — parcela {t.installmentNumber} de {t.installmentTotal}
                        <span className="text-xs text-slate-500"> · compra {dayBR(brDayKey(t.date))}</span>
                      </span>
                      <Money value={Number(t.amount)} className="text-slate-900" />
                    </p>
                  ))}
                </div>
              )}

              <details className="rounded-lg border border-slate-200">
                <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm text-slate-600">Editar cartão</summary>
                <div className="border-t border-slate-100 p-4">
                  <PfForm action={saveCardAction} keepValues>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="activeField" value="1" />
                    <CardFields card={c} />
                    <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="active" defaultChecked={c.active} className="h-5 w-5 rounded border-slate-300" /> Cartão ativo
                    </label>
                  </PfForm>
                </div>
              </details>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Novo cartão de crédito</CardTitle>
        </CardHeader>
        <CardContent>
          <PfForm action={saveCardAction} submitLabel="Adicionar cartão">
            <CardFields />
          </PfForm>
          <p className="mt-3 text-xs text-slate-500">Compras no cartão entram como gasto na data da compra; pagar a fatura só tira o dinheiro da conta (não conta duas vezes).</p>
        </CardContent>
      </Card>
    </div>
  );
}
