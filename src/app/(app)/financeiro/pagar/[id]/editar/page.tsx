import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PayableForm } from "../../payable-form";
import { updatePayableAction } from "../../actions";

export default async function EditarContaPagarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [payable, accounts] = await Promise.all([
    prisma.payable.findUnique({ where: { id } }),
    prisma.financialAccount.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!payable) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar conta a pagar nº {payable.number}</h1>
      </div>
      <PayableForm
        action={updatePayableAction.bind(null, payable.id)}
        accounts={accounts}
        lockMoney={payable.status !== "PENDENTE"}
        submitLabel="Salvar alterações"
        defaults={{
          description: payable.description,
          category: payable.category ?? "",
          supplier: payable.supplier ?? "",
          amount: Number(payable.amount).toFixed(2),
          dueDate: payable.dueDate ? payable.dueDate.toISOString().slice(0, 10) : "",
          accountId: payable.accountId ?? "",
          notes: payable.notes ?? "",
        }}
      />
    </div>
  );
}
