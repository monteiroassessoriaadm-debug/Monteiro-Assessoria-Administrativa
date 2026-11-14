import { prisma } from "@/lib/prisma";
import { requirePfOwner } from "@/lib/pf/access";
import * as pf from "@/lib/pf/service";
import { moneyToInput } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PfForm } from "@/components/pf/pf-form";
import { Empty, Money, dayBR } from "@/components/pf/pf-ui";
import { MonthNav, monthParam } from "../month-nav";
import { markBillPaidAction, saveBillAction } from "../actions";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ContasFixasPage({ searchParams }: { searchParams: SP }) {
  await requirePfOwner();
  const month = monthParam((await searchParams).mes, pf.currentMonth());
  const [occurrences, bills, categories, accounts] = await Promise.all([
    pf.listBillOccurrences({ month }),
    prisma.pfRecurringBill.findMany({ include: { category: true, account: true }, orderBy: [{ active: "desc" }, { dueDay: "asc" }] }),
    pf.listCategories("SAIDA"),
    prisma.pfAccount.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const pending = occurrences.filter((o) => o.status === "PENDENTE").reduce((s, o) => s + o.amount, 0);
  const paid = occurrences.filter((o) => o.status === "PAGO").reduce((s, o) => s + o.amount, 0);

  const billFields = (b?: (typeof bills)[number]) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Label>Nome</Label>
        <Input name="name" defaultValue={b?.name} placeholder="Ex.: Aluguel, Internet, Escola" required />
      </div>
      <div>
        <Label>Valor (R$)</Label>
        <Input name="amount" inputMode="decimal" defaultValue={b ? moneyToInput(Number(b.amount)) : ""} required />
      </div>
      <div>
        <Label>Dia do vencimento</Label>
        <Input name="dueDay" type="number" min={1} max={31} inputMode="numeric" defaultValue={b?.dueDay} required />
      </div>
      <div>
        <Label>Categoria</Label>
        <Select name="categoryId" defaultValue={b?.categoryId}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label>Sai de qual conta (opcional)</Label>
        <Select name="accountId" defaultValue={b?.accountId ?? ""}>
          <option value="">Escolher na hora de pagar</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-wrap gap-3">
          <MonthNav month={month} basePath="/financas-pessoais/contas-fixas" />
          <span className="text-sm text-slate-600">
            Pendente <Money value={pending} className="font-semibold text-red-700" /> · Pago <Money value={paid} className="font-semibold text-emerald-700" />
          </span>
        </CardHeader>
        <CardContent className="space-y-2">
          {occurrences.length === 0 && <Empty>Nenhuma conta fixa neste mês. Cadastre abaixo; as próximas são geradas sozinhas todo mês.</Empty>}
          {occurrences.map((o) => (
            <div key={o.id} className="flex flex-col gap-2 rounded-lg border border-slate-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                  {o.name}
                  {o.status === "PAGO" ? <Badge tone="green">pago em {dayBR(o.paidAt)}</Badge> : <Badge tone={o.daysToDue < 0 ? "red" : o.alert ? "yellow" : "slate"}>{o.alert ?? "pendente"}</Badge>}
                </p>
                <p className="text-xs text-slate-500">
                  vence {dayBR(o.dueDate)} · {o.category}
                  {o.account ? ` · ${o.account}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Money value={o.amount} className="font-semibold text-slate-900" />
                {o.status === "PENDENTE" && (
                  <PfForm action={markBillPaidAction} compact submitLabel="Marcar paga" pendingLabel="..." variant="secondary">
                    <input type="hidden" name="id" value={o.id} />
                    {!o.accountId && (
                      <Select name="accountId" className="w-auto" aria-label="Conta do pagamento">
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </Select>
                    )}
                  </PfForm>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contas fixas cadastradas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bills.map((b) => (
            <details key={b.id} className="rounded-lg border border-slate-200">
              <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-900">
                  {b.name} {!b.active && <Badge>parada</Badge>}
                </span>
                <span className="text-slate-600">
                  <Money value={Number(b.amount)} /> · dia {b.dueDay}
                </span>
              </summary>
              <div className="border-t border-slate-100 p-4">
                <PfForm action={saveBillAction} keepValues submitLabel="Salvar">
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="activeField" value="1" />
                  {billFields(b)}
                  <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="active" defaultChecked={b.active} className="h-5 w-5 rounded border-slate-300" />
                    Gerar todo mês (desmarque para parar)
                  </label>
                </PfForm>
              </div>
            </details>
          ))}
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">Nova conta fixa</p>
            <PfForm action={saveBillAction} submitLabel="Adicionar conta fixa">
              {billFields()}
            </PfForm>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
