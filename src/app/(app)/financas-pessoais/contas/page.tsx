import { requirePfOwner } from "@/lib/pf/access";
import * as pf from "@/lib/pf/service";
import { PF_ACCOUNT_TYPES } from "@/lib/pf/labels";
import { moneyToInput } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PfForm } from "@/components/pf/pf-form";
import { Money } from "@/components/pf/pf-ui";
import { saveAccountAction, saveCategoryAction } from "../actions";

export const dynamic = "force-dynamic";

function AccountTypeSelect({ value }: { value?: string }) {
  return (
    <Select name="type" defaultValue={value ?? "BANCO"}>
      {Object.entries(PF_ACCOUNT_TYPES).map(([k, l]) => (
        <option key={k} value={k}>
          {l}
        </option>
      ))}
    </Select>
  );
}

export default async function ContasPage() {
  await requirePfOwner();
  const [accounts, categories] = await Promise.all([pf.getAccountsWithBalance(), pf.listCategories(undefined, true)]);
  const total = accounts.filter((a) => a.active).reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contas e carteiras</CardTitle>
          <span className="text-sm text-slate-600">
            Saldo total <Money value={total} className="font-semibold text-slate-900" />
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            Saldo = saldo inicial + entradas − saídas − faturas de cartão pagas por esta conta. Aplicações (CDB, Tesouro…) ficam em Investimentos.
          </p>
          <div className="space-y-3">
            {accounts.map((a) => (
              <details key={a.id} className="rounded-lg border border-slate-200">
                <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-2">
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    {a.name} <Badge>{PF_ACCOUNT_TYPES[a.type]}</Badge>
                    {!a.active && <Badge tone="slate">inativa</Badge>}
                  </span>
                  <Money value={a.balance} signed className="font-semibold" />
                </summary>
                <div className="border-t border-slate-100 p-4">
                  <PfForm action={saveAccountAction} keepValues submitLabel="Salvar conta">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="activeField" value="1" />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <Label>Nome</Label>
                        <Input name="name" defaultValue={a.name} required />
                      </div>
                      <div>
                        <Label>Tipo</Label>
                        <AccountTypeSelect value={a.type} />
                      </div>
                      <div>
                        <Label>Saldo inicial (R$)</Label>
                        <Input name="openingBalance" inputMode="decimal" defaultValue={moneyToInput(a.openingBalance)} />
                      </div>
                    </div>
                    <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="active" defaultChecked={a.active} className="h-5 w-5 rounded border-slate-300" />
                      Conta ativa
                    </label>
                  </PfForm>
                </div>
              </details>
            ))}
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">Nova conta ou carteira</p>
            <PfForm action={saveAccountAction} submitLabel="Adicionar conta">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label>Nome</Label>
                  <Input name="name" placeholder="Ex.: Nubank, Banco do Brasil, Carteira" required />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <AccountTypeSelect />
                </div>
                <div>
                  <Label>Saldo atual (R$)</Label>
                  <Input name="openingBalance" inputMode="decimal" placeholder="0,00" />
                </div>
              </div>
            </PfForm>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorias e fontes de renda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            <strong>Essencial</strong> entra no cálculo de meses de reserva. <strong>Guardar</strong> conta como dinheiro poupado, não como gasto.
          </p>
          {(["ENTRADA", "SAIDA"] as const).map((type) => (
            <div key={type} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{type === "ENTRADA" ? "Fontes de renda" : "Categorias de saída"}</p>
              {categories
                .filter((c) => c.type === type)
                .map((c) => (
                  <details key={c.id} className="rounded-lg border border-slate-200">
                    <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-2 px-4 py-2 text-sm">
                      <span className="font-medium text-slate-900">{c.name}</span>
                      {c.essential && <Badge tone="blue">essencial</Badge>}
                      {c.saving && <Badge tone="green">guardar</Badge>}
                      {!c.active && <Badge>inativa</Badge>}
                    </summary>
                    <div className="border-t border-slate-100 p-4">
                      <PfForm action={saveCategoryAction} keepValues submitLabel="Salvar categoria">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="type" value={c.type} />
                        <input type="hidden" name="activeField" value="1" />
                        <div>
                          <Label>Nome</Label>
                          <Input name="name" defaultValue={c.name} required />
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                          {type === "SAIDA" && (
                            <>
                              <label className="flex min-h-11 items-center gap-2">
                                <input type="checkbox" name="essential" defaultChecked={c.essential} className="h-5 w-5 rounded border-slate-300" /> Essencial
                              </label>
                              <label className="flex min-h-11 items-center gap-2">
                                <input type="checkbox" name="saving" defaultChecked={c.saving} className="h-5 w-5 rounded border-slate-300" /> Guardar
                              </label>
                            </>
                          )}
                          <label className="flex min-h-11 items-center gap-2">
                            <input type="checkbox" name="active" defaultChecked={c.active} className="h-5 w-5 rounded border-slate-300" /> Ativa
                          </label>
                        </div>
                      </PfForm>
                    </div>
                  </details>
                ))}
            </div>
          ))}
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">Nova categoria</p>
            <PfForm action={saveCategoryAction} submitLabel="Adicionar categoria">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Nome</Label>
                  <Input name="name" required />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select name="type" defaultValue="SAIDA">
                    <option value="SAIDA">Saída (gasto)</option>
                    <option value="ENTRADA">Entrada (fonte de renda)</option>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                <label className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" name="essential" className="h-5 w-5 rounded border-slate-300" /> Essencial
                </label>
                <label className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" name="saving" className="h-5 w-5 rounded border-slate-300" /> Guardar
                </label>
              </div>
            </PfForm>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
