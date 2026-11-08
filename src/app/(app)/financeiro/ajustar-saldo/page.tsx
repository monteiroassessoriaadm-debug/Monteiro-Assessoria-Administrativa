import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/permissions";
import { getAccountBalances } from "@/lib/account-balance";
import { Card, CardContent } from "@/components/ui/card";
import { AdjustmentHistory } from "@/components/financeiro/adjustment-history";
import { AdjustBalanceForm } from "./adjust-form";

export default async function AjustarSaldoPage({
  searchParams,
}: {
  searchParams: Promise<{ conta?: string }>;
}) {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const { conta } = await searchParams;
  const accounts = (await getAccountBalances()).filter((a) => a.active);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Ajustar saldo</h1>
        <p className="text-sm text-slate-500">
          Digite quanto tem de verdade na conta. O sistema grava a diferença sem apagar o histórico. O ajuste não conta como faturamento nem como despesa.
        </p>
      </div>
      <Card>
        <CardContent className="pt-5">
          {accounts.length === 0 ? (
            <p className="text-sm text-slate-500">Cadastre uma conta em Contas bancárias primeiro.</p>
          ) : (
            <AdjustBalanceForm
              accounts={accounts.map((a) => ({ id: a.accountId, name: a.name, current: a.current }))}
              defaultAccountId={conta}
            />
          )}
        </CardContent>
      </Card>
      <AdjustmentHistory />
    </div>
  );
}
