import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDateBR, formatInstantBR } from "@/lib/utils";

const FIELD_LABELS: Record<string, string> = {
  description: "Descrição",
  amount: "Valor",
  dueDate: "Vencimento",
  supplier: "Fornecedor",
  accountId: "Conta",
  category: "Categoria",
  businessLine: "Linha de negócio",
  notes: "Observações",
  status: "Status",
  paidAt: "Pago em",
  receivedAt: "Recebido em",
  reversedAt: "Estornado em",
  name: "Nome",
  fullName: "Nome",
  tradeName: "Nome fantasia",
  title: "Título",
  nextContactDate: "Próximo contato",
  contactDate: "Último contato",
  stage: "Etapa",
  motivo: "Motivo",
};

/** Texto legível de um valor salvo no histórico: datas em dd/mm/aaaa, vazio como "vazio". */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "vazio";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateBR(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function Changes({ oldValue, newValue }: { oldValue: unknown; newValue: unknown }) {
  const before = (oldValue ?? {}) as Record<string, unknown>;
  const after = (newValue ?? {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  if (keys.length === 0) return null;

  // Exclusão guarda a ficha inteira: fica recolhida para não poluir a lista.
  if (newValue === null || keys.length > 12) {
    return (
      <details className="mt-2 text-xs text-slate-600">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium md:min-h-0">Ver dados guardados</summary>
        <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-slate-50 p-2">
          {JSON.stringify(oldValue, null, 2)}
        </pre>
      </details>
    );
  }

  return (
    <dl className="mt-2 space-y-1 text-xs">
      {keys.map((key) => (
        <div key={key} className="rounded bg-slate-50 px-2 py-1.5">
          <dt className="font-medium text-slate-500">{FIELD_LABELS[key] ?? key}</dt>
          <dd className="text-slate-800">
            <span className="text-slate-500 line-through">{formatValue(before[key])}</span> →{" "}
            <span className="font-medium">{formatValue(after[key])}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ origem?: string; q?: string }>;
}) {
  await requireRole(Role.ADMIN, Role.GESTOR);
  const { origem, q } = await searchParams;

  const logs = await prisma.mcpAuditLog.findMany({
    where: {
      source: origem === "Claude" || origem === "usuário" ? origem : undefined,
      ...(q ? { summary: { contains: q, mode: "insensitive" as const } } : {}),
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Histórico de alterações</h1>
        <p className="text-sm text-slate-500">
          O que mudou, quando e por quem, no horário de Brasília. Mostra as 200 mais recentes.
        </p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Input name="q" type="search" placeholder="Buscar..." defaultValue={q ?? ""} className="sm:max-w-xs" />
        <Select name="origem" defaultValue={origem ?? ""} className="sm:max-w-48">
          <option value="">Todas as origens</option>
          <option value="Claude">Claude</option>
          <option value="usuário">Usuário</option>
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <div className="space-y-3">
        {logs.map((log) => (
          <article key={log.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge tone={log.source === "Claude" ? "blue" : "slate"}>{log.source === "Claude" ? "Claude" : "Usuário"}</Badge>
              <time className="text-xs text-slate-500" dateTime={log.createdAt.toISOString()}>
                {formatInstantBR(log.createdAt)}
              </time>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900">{log.summary}</p>
            <p className="text-xs text-slate-500">
              {log.tool}
              {log.user ? ` · ${log.user.name}` : ""}
            </p>
            <Changes oldValue={log.oldValue} newValue={log.newValue} />
          </article>
        ))}
        {logs.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            Nenhum registro encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
