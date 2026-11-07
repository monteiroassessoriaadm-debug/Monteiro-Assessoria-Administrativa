import "server-only";
import { prisma } from "@/lib/prisma";
import { addTimelineEvent } from "@/lib/timeline";

export type AuditSource = "Claude" | "usuário";

type AuditChange = {
  entity?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
};

/** Decimal e Date viram texto; undefined some. Sem isso o campo Json recusa o valor. */
function toJson(value: unknown) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

/** Registra no histórico global uma ação de escrita, com o valor antigo e o novo quando houver. */
export async function logMcpAction(
  params: {
    tool: string;
    summary: string;
    userId: string;
    source?: AuditSource;
  } & AuditChange,
) {
  await prisma.mcpAuditLog.create({
    data: {
      tool: params.tool,
      summary: params.summary,
      userId: params.userId,
      source: params.source ?? "Claude",
      entity: params.entity,
      entityId: params.entityId,
      oldValue: toJson(params.oldValue),
      newValue: toJson(params.newValue),
    },
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

/** Só os campos que mudaram de fato, antes e depois, para o histórico ficar legível. */
export function diffFields<T extends Record<string, unknown>>(before: T, patch: Partial<T>) {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  for (const [key, next] of Object.entries(patch)) {
    if (next === undefined) continue;
    const prev = before[key];
    if (JSON.stringify(toJson(prev) ?? null) === JSON.stringify(toJson(next) ?? null)) continue;
    oldValue[key] = prev ?? null;
    newValue[key] = next;
  }
  return { oldValue, newValue, changed: Object.keys(newValue).length > 0 };
}
