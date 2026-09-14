import { prisma } from "@/lib/prisma";
import { PayableForm } from "../payable-form";
import { createPayableAction } from "../actions";

export default async function NovaContaPagarPage() {
  const accounts = await prisma.financialAccount.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Nova conta a pagar</h1>
      </div>
      <PayableForm action={createPayableAction} accounts={accounts} />
    </div>
  );
}
