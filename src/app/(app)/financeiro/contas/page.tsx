import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccountForm } from "./account-form";
import { createFinancialAccountAction } from "./actions";
import { ToggleAccountActiveButton } from "./toggle-active-button";

export default async function ContasFinanceirasPage() {
  await requireRole(Role.ADMIN, Role.GESTOR);

  const accounts = await prisma.financialAccount.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Contas e carteiras</h1>
        <p className="text-sm text-slate-500">
          Caixa, contas bancárias, contas PJ e carteiras digitais — cada movimentação
          financeira indica de onde saiu ou para onde entrou.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova conta</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountForm action={createFinancialAccountAction} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{a.name}</td>
                <td className="px-4 py-3 text-slate-600">{a.type ?? "-"}</td>
                <td className="px-4 py-3">
                  <Badge tone={a.active ? "green" : "slate"}>
                    {a.active ? "Ativa" : "Inativa"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <ToggleAccountActiveButton accountId={a.id} active={a.active} />
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  Nenhuma conta cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
