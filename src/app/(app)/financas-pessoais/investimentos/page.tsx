import { prisma } from "@/lib/prisma";
import { requirePfOwner } from "@/lib/pf/access";
import * as pf from "@/lib/pf/service";
import { PF_LIQUIDITY } from "@/lib/pf/labels";
import { moneyToInput } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PfForm } from "@/components/pf/pf-form";
import { Empty, Money, dayBR } from "@/components/pf/pf-ui";
import { saveInvestmentAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function InvestimentosPage() {
  await requirePfOwner();
  const [investments, accounts] = await Promise.all([pf.listInvestments(true), prisma.pfAccount.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } })]);
  const active = investments.filter((i) => !i.redeemed);
  const applied = active.reduce((s, i) => s + i.applied, 0);
  const current = active.reduce((s, i) => s + i.current, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Aplicado</p>
          <Money value={applied} className="text-lg font-bold text-slate-900" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Valor atual</p>
          <Money value={current} className="text-lg font-bold text-slate-900" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Rendimento</p>
          <Money value={current - applied} signed className="text-lg font-bold" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meus investimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {investments.length === 0 && <Empty>Nenhum investimento registrado.</Empty>}
          {investments.map((i) => (
            <details key={i.id} className="rounded-lg border border-slate-200">
              <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                    {i.name} <Badge>{PF_LIQUIDITY[i.liquidity]}</Badge> {i.redeemed && <Badge tone="slate">resgatado</Badge>}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {i.institution ?? "-"} · aplicado em {dayBR(i.appliedAt)}
                    {i.maturityDate ? ` · vence ${dayBR(i.maturityDate)}` : ""}
                  </span>
                </span>
                <span className="text-right text-sm">
                  <Money value={i.current} className="block font-semibold text-slate-900" />
                  <span className={i.yield >= 0 ? "text-emerald-700" : "text-red-700"}>
                    {i.yield >= 0 ? "+" : ""}
                    {i.yieldPercent.toString().replace(".", ",")}%
                  </span>
                </span>
              </summary>
              <div className="border-t border-slate-100 p-4">
                <PfForm action={saveInvestmentAction} keepValues>
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="redeemedField" value="1" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <Label>Nome</Label>
                      <Input name="name" defaultValue={i.name} required />
                    </div>
                    <div>
                      <Label>Instituição</Label>
                      <Input name="institution" defaultValue={i.institution ?? ""} />
                    </div>
                    <div>
                      <Label>Valor atual (R$)</Label>
                      <Input name="current" inputMode="decimal" defaultValue={moneyToInput(i.current)} />
                    </div>
                    <div>
                      <Label>Valor aplicado (R$)</Label>
                      <Input name="applied" inputMode="decimal" defaultValue={moneyToInput(i.applied)} />
                    </div>
                    <div>
                      <Label>Liquidez</Label>
                      <Select name="liquidity" defaultValue={i.liquidity}>
                        {Object.entries(PF_LIQUIDITY).map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label>Vencimento</Label>
                      <Input name="maturityDate" type="date" defaultValue={i.maturityDate ?? ""} />
                    </div>
                  </div>
                  <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="redeemed" defaultChecked={i.redeemed} className="h-5 w-5 rounded border-slate-300" /> Já resgatei
                  </label>
                </PfForm>
              </div>
            </details>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrar investimento</CardTitle>
        </CardHeader>
        <CardContent>
          <PfForm action={saveInvestmentAction} submitLabel="Registrar">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label>Nome</Label>
                <Input name="name" placeholder="Ex.: Tesouro Selic, CDB 110%" required />
              </div>
              <div>
                <Label>Instituição</Label>
                <Input name="institution" placeholder="Ex.: Nubank, Inter" />
              </div>
              <div>
                <Label>Valor aplicado (R$)</Label>
                <Input name="applied" inputMode="decimal" required />
              </div>
              <div>
                <Label>Data da aplicação</Label>
                <Input name="appliedAt" type="date" defaultValue={pf.todayKey()} />
              </div>
              <div>
                <Label>Liquidez</Label>
                <Select name="liquidity" defaultValue="DIARIA">
                  {Object.entries(PF_LIQUIDITY).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Vencimento (opcional)</Label>
                <Input name="maturityDate" type="date" />
              </div>
              <div className="sm:col-span-3">
                <Label>O dinheiro saiu de qual conta? (opcional)</Label>
                <Select name="fromAccountId" defaultValue="">
                  <option value="">Não lançar saída (já estava investido)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </PfForm>
        </CardContent>
      </Card>
    </div>
  );
}
