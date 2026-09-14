"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDateBR, cn } from "@/lib/utils";
import { LEAD_STAGES, stageLabels, temperatureTone, temperatureLabel } from "@/lib/lead-labels";
import { moveLeadStageAction } from "./actions";

export type KanbanLead = {
  id: string;
  name: string;
  whatsapp: string | null;
  phone: string | null;
  temperature: string;
  stage: string;
  nextContactDate: string | null;
  responsible: { name: string } | null;
  serviceInterest: { name: string } | null;
};

export function KanbanBoard({ leads }: { leads: KanbanLead[] }) {
  const [items, setItems] = useState(leads);
  const [dragging, setDragging] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDrop(stage: string) {
    if (!dragging) return;
    const leadId = dragging;
    setDragging(null);
    setItems((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage } : l)),
    );
    startTransition(() => {
      moveLeadStageAction(leadId, stage);
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {LEAD_STAGES.map((stage) => {
        const stageLeads = items.filter((l) => l.stage === stage);
        return (
          <div
            key={stage}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(stage)}
            className="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100 p-3"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {stageLabels[stage]}
              </h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                {stageLeads.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {stageLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDragging(lead.id)}
                  onDragEnd={() => setDragging(null)}
                  className={cn(
                    "cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing",
                    dragging === lead.id && "opacity-50",
                  )}
                >
                  <Link
                    href={`/leads/${lead.id}`}
                    className="text-sm font-medium text-slate-900 hover:underline"
                  >
                    {lead.name}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">
                    {lead.whatsapp ?? lead.phone ?? "-"}
                  </p>
                  {lead.serviceInterest && (
                    <p className="mt-1 text-xs text-slate-500">
                      {lead.serviceInterest.name}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <Badge tone={temperatureTone[lead.temperature]}>
                      {temperatureLabel[lead.temperature]}
                    </Badge>
                    {lead.nextContactDate && (
                      <span className="text-[11px] text-slate-400">
                        {formatDateBR(lead.nextContactDate)}
                      </span>
                    )}
                  </div>
                  {lead.responsible && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      {lead.responsible.name}
                    </p>
                  )}
                </div>
              ))}
              {stageLeads.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
                  Sem leads
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
