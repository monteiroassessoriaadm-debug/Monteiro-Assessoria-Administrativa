"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { LeadStage } from "@/generated/prisma/enums";
import { LEAD_STAGES } from "@/lib/lead-labels";

export async function moveLeadStageAction(leadId: string, stage: string) {
  await requireSession();

  if (!LEAD_STAGES.includes(stage as (typeof LEAD_STAGES)[number])) {
    return;
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { stage: stage as LeadStage, lastContactDate: new Date() },
  });

  revalidatePath("/funil");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}
