import { prisma } from "@/lib/prisma";
import { requirePfOwner } from "@/lib/pf/access";
import * as pf from "@/lib/pf/service";
import { monthLabelFull, type PayoffResult } from "@/lib/pf/calc";
import { PF_DEBT_STATUS, PF_DEBT_STATUS_TONE, PF_DEBT_TYPES } from "@/lib/pf/labels";
import { moneyToInput, parseMoney } from "@/lib/money";
import { brDayKey } from "@/lib/br-time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PfForm } from "@/components/pf/pf-form";
import { Empty, Money, dayBR } from "@/components/pf/pf-ui";
import { formatCurrencyBRL } from "@/lib/utils";
import { addNegotiationAction, createDebtAction, deleteDebtAction, payDebtAction, updateDebtAction } from "../actions";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;
type Debt = Awaited<ReturnType<typeof pf.listDebts>>[number];

function DebtFields({ d }: { d?: Debt }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <Label>Credor</Label>
        <Input name="creditor" defaultValue={d?.creditor} placeholder="Ex.: Banco X, tio João" required />
      </div>
      <div>
        <Label>Tipo</Label>
        <Select name="type" defaultValue={d?.type ?? "EMPRESTIMO_PESSOAL"}>
          {Object.entries(PF_DEBT_TYPES).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Saldo devedor atual (R$)</Label>
        <Input name="balance" inputMode="decimal" defaultValue={d ? moneyToInput(Number(d.balance)) : ""} required />
      </div>
      <div>
        <Label>Juros ao mês (%)</Label>
        <Input name="monthlyRate" inputMode="decimal" defaultValue={d ? String(Number(d.monthlyRate)).replace(".", ",") : ""} placeholder="Ex.: 3,5" />
      </div>
      <div>
        <Label>Parcela (R$)</Label>
        <Input name="installment" inputMode="decimal" defaultValue={d ? moneyToInput(Number(d.installment)) : ""} />
      </div>
      <div>
        <Label>Parcelas restantes</Label>
        <Input name="remainingInstallments" type="number" min={0} defaultValue={d?.remainingInstallments ?? ""} />
      </div>
      <div>
        <Label>Dia do vencimento</Label>
        <Input name="dueDay" type="number" min={1} max={31} defaultValue={d?.dueDay ?? ""} />
      </div>
      <div>
        <Label>Situação</Label>
        <Select name="status" defaultValue={d?.status ?? "EM_DIA"}>
          {Object.entries(PF_DEBT_STATUS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Dias em atraso</Label>
        <Input name="daysLate" type="number" min={0} defaultValue={d?.daysLate ?? 0} />
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <Label>Observação</Label>
        <Input name="notes" defaultValue={d?.notes ?? ""} />
      </div>
    </div>
  );
}

function StrategyCard({ title, subtitle, r, best }: { title: string; subtitle: string; r: PayoffResult; best: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${best ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200"}`}>
      <p className="font-semibold text-slate-900">
        {title} {best && <Badge tone="green">menos juros</Badge>}
      </p>
      <p className="text-xs text-slate-500">{subtitle}</p>
      {r.paidOff ? (
        <>
          <p className="mt-3 text-sm text-slate-600">Livre das dívidas em</p>
          <p className="text-xl font-bold first-letter:uppercase text-slate-900">{r.freedomMonth ? monthLabelFull(r.freedomMonth) : "-"}</p>
          <p className="text-sm text-slate-600">
            {r.months} {r.months === 1 ? "mês" : "meses"} · juros totais <strong className="text-red-700">{formatCurrencyBRL(r.totalInterest)}</strong>
          </p>
          <ol className="mt-3 list-decimal space-y-0.5 pl-5 text-sm text-slate-700">
            {r.order.map((o) => (
              <li key={o.id}>
                {o.name} — quita em {monthLabelFull(o.month)}
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="mt-3 text-sm text-red-700">Com esse valor a dívida não acaba: as parcelas não cobrem os juros. Aumente o valor extra ou renegocie.</p>
      )}
    </div>
  );
}

export default async function DividasPage({ searchParams }: { searchParams: SP }) {
  await requirePfOwner();
  const sp = await searchParams;
  const extraText = typeof sp.extra === "string" ? sp.extra : "";
  const extra = parseMoney(extraText) ?? 0;
  const [debts, sim, accounts] = await Promise.all([
    pf.listDebts(true),
    pf.simulateDebtPayoff(extra),
    prisma.pfAccount.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const open = debts.filter((d) => d.status !== "QUITADA");
  const total = open.reduce((s, d) => s + Number(d.balance), 0);
  const parcelas = open.reduce((s, d) => s + Number(d.installment), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Dívida total</p>
          <Money value={total} className="text-xl font-bold text-red-700" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Parcelas por mês</p>
          <Money value={parcelas} className="text-xl font-bold text-slate-900" />
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1">
          <p className="text-xs text-slate-500">Só pagando as parcelas, livre em</p>
          <p className="text-xl font-bold first-letter:uppercase text-slate-900">
            {open.length === 0 ? "já está livre" : sim.semExtra.paidOff && sim.semExtra.freedomMonth ? monthLabelFull(sim.semExtra.freedomMonth) : "não acaba"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simulador de quitação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="extra">Valor extra por mês (R$)</Label>
              <Input id="extra" name="extra" inputMode="decimal" defaultValue={extraText} placeholder="Ex.: 300,00" className="w-44" />
            </div>
            <Button type="submit" variant="secondary">
              Simular
            </Button>
          </form>
          {open.length === 0 ? (
            <Empty>Nenhuma dívida aberta para simular.</Empty>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <StrategyCard
                  title="Avalanche"
                  subtitle="Paga primeiro a de maior juro"
                  r={sim.avalanche}
                  best={sim.avalanche.paidOff && sim.avalanche.totalInterest <= sim.bolaDeNeve.totalInterest}
                />
                <StrategyCard
                  title="Bola de Neve"
                  subtitle="Paga primeiro a de menor saldo (motiva mais)"
                  r={sim.bolaDeNeve}
                  best={sim.bolaDeNeve.paidOff && sim.bolaDeNeve.totalInterest < sim.avalanche.totalInterest}
                />
              </div>
              <p className="text-xs text-slate-500">
                Conta: todo mês os juros entram, as parcelas mínimas são pagas e o valor extra (mais as parcelas das dívidas já quitadas) vai para a dívida da vez. É uma estimativa.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Minhas dívidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {debts.length === 0 && <Empty>Nenhuma dívida cadastrada.</Empty>}
          {debts.map((d) => (
            <details key={d.id} className="rounded-lg border border-slate-200">
              <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                    {d.creditor}
                    <Badge tone={PF_DEBT_STATUS_TONE[d.status]}>
                      {PF_DEBT_STATUS[d.status]}
                      {d.status === "ATRASADA" && d.daysLate > 0 ? ` · ${d.daysLate} dias` : ""}
                    </Badge>
                  </span>
                  <span className="block text-xs text-slate-500">
                    {PF_DEBT_TYPES[d.type]} · {String(Number(d.monthlyRate)).replace(".", ",")}% a.m. · parcela {formatCurrencyBRL(Number(d.installment))}
                    {d.remainingInstallments != null ? ` · faltam ${d.remainingInstallments}` : ""}
                  </span>
                </span>
                <Money value={Number(d.balance)} className="font-semibold text-slate-900" />
              </summary>
              <div className="space-y-5 border-t border-slate-100 p-4">
                {d.status !== "QUITADA" && accounts.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900">Pagar parcela</p>
                    <PfForm action={payDebtAction} compact submitLabel="Lançar pagamento" variant="secondary">
                      <input type="hidden" name="id" value={d.id} />
                      <Input name="amount" inputMode="decimal" defaultValue={moneyToInput(Number(d.installment) || Number(d.balance))} className="w-32" aria-label="Valor" />
                      <Select name="accountId" className="w-auto" aria-label="Conta">
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </Select>
                    </PfForm>
                    <p className="mt-1 text-xs text-slate-500">Lança a saída em &quot;Dívidas&quot; e abate o valor do saldo. Se o banco cobrar juros, ajuste o saldo abaixo.</p>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-900">Negociações</p>
                  {d.negotiations.length === 0 && <p className="text-sm text-slate-400">Nenhuma negociação registrada.</p>}
                  <ul className="space-y-1 text-sm">
                    {d.negotiations.map((n) => (
                      <li key={n.id} className="rounded-lg bg-slate-50 px-3 py-2">
                        <span className="text-xs text-slate-500">{dayBR(brDayKey(n.date))}</span> · {n.proposal}
                        {n.result && <span className="text-slate-600"> → {n.result}</span>}
                      </li>
                    ))}
                  </ul>
                  <PfForm action={addNegotiationAction} submitLabel="Registrar negociação" className="mt-3">
                    <input type="hidden" name="debtId" value={d.id} />
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr_1fr]">
                      <Input name="date" type="date" defaultValue={pf.todayKey()} aria-label="Data" />
                      <Textarea name="proposal" rows={1} placeholder="Proposta (ex.: 12x de 300 sem juros)" required />
                      <Textarea name="result" rows={1} placeholder="Resultado (opcional)" />
                    </div>
                  </PfForm>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-900">Editar dados</p>
                  <PfForm action={updateDebtAction} keepValues submitLabel="Salvar dívida">
                    <input type="hidden" name="id" value={d.id} />
                    <DebtFields d={d} />
                  </PfForm>
                </div>
                <PfForm action={deleteDebtAction} compact submitLabel="Excluir dívida" variant="ghost" confirmText="Excluir esta dívida e o histórico de negociações?">
                  <input type="hidden" name="id" value={d.id} />
                </PfForm>
              </div>
            </details>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nova dívida</CardTitle>
        </CardHeader>
        <CardContent>
          <PfForm action={createDebtAction} submitLabel="Cadastrar dívida">
            <DebtFields />
          </PfForm>
        </CardContent>
      </Card>
    </div>
  );
}
