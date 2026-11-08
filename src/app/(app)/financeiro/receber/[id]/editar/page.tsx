import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { moneyToInput } from "@/lib/money";
import { displayClientName } from "@/lib/client-display";
import { DEFAULT_BUSINESS_LINES, ReceivableFormLoader } from "../../form-data";
import { ReceivableForm } from "../../receivable-form";
import { updateReceivableAction } from "../../actions";

export default async function EditarContaReceberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [receivable, { clients, accounts, businessLines }] = await Promise.all([
    prisma.receivable.findUnique({ where: { id } }),
    ReceivableFormLoader(),
  ]);
  if (!receivable) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar conta a receber nº {receivable.number}</h1>
      </div>
      <ReceivableForm
        action={updateReceivableAction.bind(null, receivable.id)}
        clients={clients.map((c) => ({ id: c.id, label: displayClientName(c) }))}
        accounts={accounts}
        businessLines={businessLines.length ? businessLines : DEFAULT_BUSINESS_LINES}
        lockMoney={receivable.status !== "PENDENTE"}
        submitLabel="Salvar alterações"
        defaults={{
          description: receivable.description,
          clientId: receivable.clientId ?? "",
          amount: moneyToInput(receivable.amount.toString()),
          dueDate: receivable.dueDate ? receivable.dueDate.toISOString().slice(0, 10) : "",
          accountId: receivable.accountId ?? "",
          paymentMethod: receivable.paymentMethod ?? "",
          category: receivable.category ?? "",
          businessLine: receivable.businessLine ?? "",
          notes: receivable.notes ?? "",
        }}
      />
    </div>
  );
}
