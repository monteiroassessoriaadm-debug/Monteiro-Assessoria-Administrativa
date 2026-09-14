import { prisma } from "@/lib/prisma";
import { displayClientName } from "@/lib/client-display";
import { ReceivableForm } from "../receivable-form";
import { createReceivableAction } from "../actions";

export default async function NovaContaReceberPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;

  const [clients, accounts] = await Promise.all([
    prisma.client.findMany({
      where: { status: "ATIVO" },
      select: { id: true, type: true, fullName: true, legalName: true, tradeName: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.financialAccount.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Nova conta a receber</h1>
      </div>
      <ReceivableForm
        action={createReceivableAction}
        clients={clients.map((c) => ({ id: c.id, label: displayClientName(c) }))}
        accounts={accounts}
        defaultClientId={clientId}
      />
    </div>
  );
}
