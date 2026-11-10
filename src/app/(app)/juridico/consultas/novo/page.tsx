import { prisma } from "@/lib/prisma";
import { displayClientName } from "@/lib/client-display";
import { ConsultationForm } from "./consultation-form";
import { createConsultationAction } from "../../actions";

export default async function NovaConsultaPage() {
  const clients = await prisma.client.findMany({ where: { status: "ATIVO" }, orderBy: { createdAt: "desc" } });
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Registrar orientação jurídica</h1>
      <ConsultationForm action={createConsultationAction} clients={clients.map((c) => ({ id: c.id, label: displayClientName(c) }))} />
    </div>
  );
}
