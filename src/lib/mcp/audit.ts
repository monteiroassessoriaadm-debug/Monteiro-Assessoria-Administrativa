import "server-only";
import { prisma } from "@/lib/prisma";
import { addTimelineEvent } from "@/lib/timeline";

/** Registra, no histórico global, que o Claude fez uma ação de escrita via MCP. */
export async function logMcpAction(params: {
  tool: string;
  summary: string;
  userId: string;
}) {
  await prisma.mcpAuditLog.create({
    data: { tool: params.tool, summary: params.summary, userId: params.userId },
  });
}

/** Quando a ação está ligada a um cliente, carimba também na linha do tempo dele. */
export async function logClientTimelineViaClaude(params: {
  clientId: string;
  type: string;
  description: string;
  userId: string;
}) {
  await addTimelineEvent({
    clientId: params.clientId,
    type: params.type,
    description: `${params.description} (via Claude)`,
    createdById: params.userId,
  });
}
