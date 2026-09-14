import Link from "next/link";
import { List } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { KanbanBoard, type KanbanLead } from "./kanban-board";

export default async function FunilPage() {
  const leads = await prisma.lead.findMany({
    include: {
      responsible: { select: { name: true } },
      serviceInterest: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const kanbanLeads: KanbanLead[] = leads.map((l) => ({
    id: l.id,
    name: l.name,
    whatsapp: l.whatsapp,
    phone: l.phone,
    temperature: l.temperature,
    stage: l.stage,
    nextContactDate: l.nextContactDate ? l.nextContactDate.toISOString() : null,
    responsible: l.responsible,
    serviceInterest: l.serviceInterest,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Funil de vendas</h1>
          <p className="text-sm text-slate-500">
            Arraste os cartões entre as etapas para atualizar o estágio do lead.
          </p>
        </div>
        <Link href="/leads">
          <Button variant="outline">
            <List className="h-4 w-4" /> Ver em lista
          </Button>
        </Link>
      </div>
      <KanbanBoard leads={kanbanLeads} />
    </div>
  );
}
