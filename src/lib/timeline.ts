import "server-only";
import { prisma } from "@/lib/prisma";

export async function addTimelineEvent(params: {
  clientId: string;
  type: string;
  description: string;
  createdById?: string;
}) {
  return prisma.timelineEvent.create({
    data: {
      clientId: params.clientId,
      type: params.type,
      description: params.description,
      createdById: params.createdById,
    },
  });
}
