import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdjustmentHistory } from "@/components/financeiro/adjustment-history";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { AccountForm } from "../../account-form";
import { updateFinancialAccountAction } from "../../actions";

export default async function EditarContaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const { id } = await params;
  const account = await prisma.financialAccount.findUnique({ where: { id } });
  if (!account) notFound();

  const boundAction = updateFinancialAccountAction.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar conta</h1>
        <p className="text-sm text-slate-500">
          O saldo inicial é o valor que a conta já tinha antes de começar a usar o
          sistema — não entra em contas a receber nem em faturamento, só soma no saldo
          atual.
        </p>
      </div>
      <AccountForm
        action={boundAction}
        isEdit
        submitLabel="Salvar alterações"
        defaults={{
          name: account.name,
          type: account.type,
          active: account.active,
          openingBalance: account.openingBalance ? account.openingBalance.toString() : null,
          openingBalanceAt: account.openingBalanceAt
            ? account.openingBalanceAt.toISOString().slice(0, 10)
            : null,
        }}
      />
      <div className="flex justify-end">
        <Link href={`/financeiro/ajustar-saldo?conta=${id}`}>
          <Button variant="outline">Ajustar saldo desta conta</Button>
        </Link>
      </div>
      <AdjustmentHistory accountId={id} />
    </div>
  );
}
