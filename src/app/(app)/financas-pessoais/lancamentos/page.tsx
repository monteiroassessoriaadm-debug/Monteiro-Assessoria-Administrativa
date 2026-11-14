import Link from "next/link";
import { requirePfOwner } from "@/lib/pf/access";
import * as pf from "@/lib/pf/service";
import { brDayKey } from "@/lib/br-time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TableCard, TableCardEmpty, TableCardList } from "@/components/ui/table-card";
import { PfForm } from "@/components/pf/pf-form";
import { Money, dayBR } from "@/components/pf/pf-ui";
import { formatCurrencyBRL } from "@/lib/utils";
import { MonthNav, monthParam } from "../month-nav";
import { TransactionForm } from "./transaction-form";
import { AttachmentUpload } from "./attachment-upload";
import { deleteTransactionAction, importWithdrawalAction } from "../actions";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function LancamentosPage({ searchParams }: { searchParams: SP }) {
  await requirePfOwner();
  const sp = await searchParams;
  const month = monthParam(sp.mes, pf.currentMonth());
  const tipo = sp.tipo === "ENTRADA" || sp.tipo === "SAIDA" ? sp.tipo : undefined;
  const showAllWithdrawals = sp.retiradas === "todas";

  const [txs, categories, accounts, cards, withdrawals] = await Promise.all([
    pf.listTransactions({ month, type: tipo, take: 500 }),
    pf.listCategories(),
    pf.getAccountsWithBalance(),
    prismaCards(),
    pf.listWithdrawalCandidates(showAllWithdrawals),
  ]);
  const activeAccounts = accounts.filter((a) => a.active);
  const entradas = txs.filter((t) => t.type === "ENTRADA").reduce((s, t) => s + Number(t.amount), 0);
  const saidas = txs.filter((t) => t.type === "SAIDA").reduce((s, t) => s + Number(t.amount), 0);

  const where = (t: (typeof txs)[number]) => (t.card ? `Cartão ${t.card.name}${t.invoiceMonth ? ` · fatura ${t.invoiceMonth.slice(5)}/${t.invoiceMonth.slice(0, 4)}` : ""}` : (t.account?.name ?? "-"));
  const actions = (t: (typeof txs)[number]) => (
    <>
      {t.attachment && (
        <a href={`/financas-pessoais/anexo/${t.attachment.id}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center px-2 text-xs text-blue-600 md:min-h-8">
          Ver comprovante
        </a>
      )}
      <AttachmentUpload transactionId={t.id} hasFile={!!t.attachment} />
      <Link href={`/financas-pessoais/lancamentos/${t.id}`} className="inline-flex min-h-11 items-center px-2 text-xs text-slate-600 md:min-h-8">
        Editar
      </Link>
      <PfForm action={deleteTransactionAction} compact submitLabel="Excluir" pendingLabel="..." variant="ghost" confirmText="Excluir este lançamento?">
        <input type="hidden" name="id" value={t.id} />
      </PfForm>
      {t.installmentGroupId && (
        <PfForm action={deleteTransactionAction} compact submitLabel="Excluir todas as parcelas" pendingLabel="..." variant="ghost" confirmText="Excluir TODAS as parcelas desta compra?">
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="all" value="1" />
        </PfForm>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Novo lançamento</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm
            today={pf.todayKey()}
            categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
            accounts={activeAccounts.map((a) => ({ id: a.id, name: a.name }))}
            cards={cards}
          />
        </CardContent>
      </Card>

      <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex min-h-11 cursor-pointer items-center px-5 py-3 text-sm font-semibold text-slate-900">Importar retirada da Monteiro</summary>
        <div className="space-y-3 border-t border-slate-100 p-5">
          <p className="text-sm text-slate-500">
            Escolha uma saída já paga pela empresa. Vira uma <strong>entrada pessoal</strong> &quot;Retirada Monteiro&quot; com o mesmo valor e data. Os dois lados não ficam ligados.
          </p>
          <Link href={`/financas-pessoais/lancamentos?mes=${month}${showAllWithdrawals ? "" : "&retiradas=todas"}`} className="text-sm text-blue-600">
            {showAllWithdrawals ? "Mostrar só as que parecem retirada" : "Mostrar todas as saídas pagas (120 dias)"}
          </Link>
          {withdrawals.length === 0 && <p className="text-sm text-slate-400">Nenhuma saída encontrada.</p>}
          {activeAccounts.length === 0 && withdrawals.length > 0 && <p className="text-sm text-amber-700">Cadastre uma conta pessoal para receber a retirada.</p>}
          {activeAccounts.length > 0 &&
            withdrawals.map((w) => (
              <div key={w.id} className="flex flex-col gap-2 rounded-lg border border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-slate-900">
                    {formatCurrencyBRL(w.amount)} · {dayBR(w.date)}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    #{w.number} {w.description}
                    {w.category ? ` · ${w.category}` : ""}
                  </p>
                  {w.alreadyImported && <Badge tone="yellow">já existe entrada com mesmo valor e data</Badge>}
                </div>
                <PfForm action={importWithdrawalAction} compact submitLabel="Importar" pendingLabel="Importando...">
                  <input type="hidden" name="payableId" value={w.id} />
                  <Select name="accountId" className="w-auto">
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </PfForm>
              </div>
            ))}
        </div>
      </details>

      <Card>
        <CardHeader className="flex-wrap gap-3">
          <MonthNav month={month} basePath="/financas-pessoais/lancamentos" params={{ tipo }} />
          <div className="flex gap-1 text-sm">
            {[
              { v: undefined, l: "Todos" },
              { v: "ENTRADA", l: "Entradas" },
              { v: "SAIDA", l: "Saídas" },
            ].map((f) => (
              <Link
                key={f.l}
                href={`/financas-pessoais/lancamentos?mes=${month}${f.v ? `&tipo=${f.v}` : ""}`}
                className={`inline-flex min-h-11 items-center rounded-lg px-3 md:min-h-8 ${tipo === f.v ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {f.l}
              </Link>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Entradas <Money value={entradas} className="font-semibold text-emerald-700" /> · Saídas <Money value={saidas} className="font-semibold text-red-700" />
          </p>
          <div className="table-scroll hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3">Descrição</th>
                  <th className="px-3 py-3">Categoria</th>
                  <th className="px-3 py-3">Conta / cartão</th>
                  <th className="px-3 py-3 text-right">Valor</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {txs.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{dayBR(brDayKey(t.date))}</td>
                    <td className="px-3 py-2 text-slate-900">{t.description}</td>
                    <td className="px-3 py-2 text-slate-600">{t.category.name}</td>
                    <td className="px-3 py-2 text-slate-600">{where(t)}</td>
                    <td className={`px-3 py-2 text-right font-medium whitespace-nowrap ${t.type === "ENTRADA" ? "text-emerald-700" : "text-red-700"}`}>
                      {t.type === "ENTRADA" ? "+" : "−"} {formatCurrencyBRL(Number(t.amount))}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center justify-end gap-1">{actions(t)}</div>
                    </td>
                  </tr>
                ))}
                {txs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Nenhum lançamento neste mês.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <TableCardList>
            {txs.map((t) => (
              <TableCard
                key={t.id}
                title={t.description}
                subtitle={`${dayBR(brDayKey(t.date))} · ${t.category.name}`}
                fields={[
                  {
                    label: t.type === "ENTRADA" ? "Entrada" : "Saída",
                    value: <span className={t.type === "ENTRADA" ? "text-emerald-700" : "text-red-700"}>{formatCurrencyBRL(Number(t.amount))}</span>,
                  },
                  { label: "Onde", value: where(t) },
                ]}
                actions={actions(t)}
              />
            ))}
            {txs.length === 0 && <TableCardEmpty>Nenhum lançamento neste mês.</TableCardEmpty>}
          </TableCardList>
        </CardContent>
      </Card>
    </div>
  );
}

async function prismaCards() {
  const cards = await pf.getCardsOverview();
  return cards.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name }));
}
