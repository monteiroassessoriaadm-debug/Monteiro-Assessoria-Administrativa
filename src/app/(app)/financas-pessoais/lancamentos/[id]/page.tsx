import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePfOwner } from "@/lib/pf/access";
import { listCategories } from "@/lib/pf/service";
import { brDayKey } from "@/lib/br-time";
import { moneyToInput } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PfForm } from "@/components/pf/pf-form";
import { updateTransactionAction } from "../../actions";

export default async function EditarLancamentoPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePfOwner();
  const { id } = await params;
  const tx = await prisma.pfTransaction.findUnique({ where: { id }, include: { card: true } });
  if (!tx) notFound();
  const [categories, accounts] = await Promise.all([listCategories(tx.type), prisma.pfAccount.findMany({ where: { active: true } })]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar lançamento</CardTitle>
        <Link href="/financas-pessoais/lancamentos" className="text-sm text-blue-600">
          ← Voltar
        </Link>
      </CardHeader>
      <CardContent>
        <PfForm action={updateTransactionAction} keepValues submitLabel="Salvar alterações">
          <input type="hidden" name="id" value={tx.id} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Descrição</Label>
              <Input name="description" defaultValue={tx.description} required />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input name="amount" inputMode="decimal" defaultValue={moneyToInput(Number(tx.amount))} required />
            </div>
            <div>
              <Label>Data</Label>
              <Input name="date" type="date" defaultValue={brDayKey(tx.date)} required />
            </div>
            <div>
              <Label>{tx.type === "ENTRADA" ? "Fonte de renda" : "Categoria"}</Label>
              <Select name="categoryId" defaultValue={tx.categoryId}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            {tx.card ? (
              <div>
                <Label>Cartão</Label>
                <Input value={`${tx.card.name}${tx.installmentTotal ? ` · parcela ${tx.installmentNumber} de ${tx.installmentTotal}` : ""}`} disabled />
              </div>
            ) : (
              <div>
                <Label>Conta</Label>
                <Select name="accountId" defaultValue={tx.accountId ?? ""}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="sm:col-span-2">
              <Label>Observação</Label>
              <Textarea name="notes" rows={2} defaultValue={tx.notes ?? ""} />
            </div>
          </div>
        </PfForm>
      </CardContent>
    </Card>
  );
}
