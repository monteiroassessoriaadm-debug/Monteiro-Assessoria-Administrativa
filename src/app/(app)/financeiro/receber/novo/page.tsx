import { displayClientName } from "@/lib/client-display";
import { ReceivableFormLoader } from "../form-data";
import { ReceivableForm } from "../receivable-form";
import { createReceivableAction } from "../actions";

export default async function NovaContaReceberPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const { clients, accounts, businessLines } = await ReceivableFormLoader();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Nova conta a receber</h1>
      </div>
      <ReceivableForm
        action={createReceivableAction}
        clients={clients.map((c) => ({ id: c.id, label: displayClientName(c) }))}
        accounts={accounts}
        businessLines={businessLines}
        defaultClientId={clientId}
      />
    </div>
  );
}
