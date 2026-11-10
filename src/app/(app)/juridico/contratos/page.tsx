import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { ActiveFilter, statusLabel, statusList } from "@/components/ui/active-filter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCard, TableCardList, TableCardEmpty } from "@/components/ui/table-card";
import { formatDateBR } from "@/lib/utils";
import { contractNextDate, contractValue } from "@/lib/contract-display";
import { displayClientName } from "@/lib/client-display";
import { contractKindLabels, contractStatusLabels, contractStatusTone } from "@/lib/lead-labels";
import { refreshContractStatuses } from "@/lib/contracts";
import { brDayKey, addDaysKey, keyToUtc } from "@/lib/br-time";
import type { Prisma } from "@/generated/prisma/client";

const selectClass = "h-11 min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-base md:h-10 md:text-sm";

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tipo?: string; q?: string; vence?: string }>;
}) {
  const { status, tipo, q, vence } = await searchParams;
  await refreshContractStatuses();

  const statuses = statusList(status);
  const days = Number(vence) > 0 ? Number(vence) : null;
  const search = q?.trim();

  const where: Prisma.ContractWhereInput = {
    ...(statuses.length ? { status: { in: statuses as never[] } } : {}),
    ...(tipo === "CONTRATO" || tipo === "DOCUMENTO" ? { kind: tipo } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: "insensitive" } },
            { title: { contains: search, mode: "insensitive" } },
            { client: { fullName: { contains: search, mode: "insensitive" } } },
            { client: { tradeName: { contains: search, mode: "insensitive" } } },
            { client: { legalName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  if (days) {
    const today = keyToUtc(brDayKey(new Date()));
    const limit = keyToUtc(addDaysKey(brDayKey(new Date()), days));
    where.status = { in: ["ASSINADO", "VIGENTE"] };
    where.AND = [{ OR: [{ endDate: { gte: today, lte: limit } }, { renewalDate: { gte: today, lte: limit } }] }];
  }

  const contracts = await prisma.contract.findMany({
    where,
    include: { client: true, service: true },
    orderBy: [{ year: "desc" }, { sequence: "desc" }],
    take: 200,
  });

  const filterLabel = [
    statuses.length ? statusLabel(statuses, contractStatusLabels) : null,
    tipo ? contractKindLabels[tipo] : null,
    search ? `"${search}"` : null,
    days ? `vencimento ou reajuste nos próximos ${days} dias` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Contratos</h1>
          <p className="text-sm text-slate-500">Contratos e documentos gerados pelo Jurídico a partir dos modelos.</p>
        </div>
        <Link href="/juridico/contratos/novo">
          <Button>
            <Plus className="h-4 w-4" /> Novo contrato
          </Button>
        </Link>
      </div>

      <FilterDrawer>
        <form className="flex flex-wrap gap-3">
          <Input name="q" defaultValue={q ?? ""} placeholder="Nº, cliente ou título" className="md:w-64" />
          <select name="status" defaultValue={status ?? ""} className={selectClass}>
            <option value="">Todos os status</option>
            {Object.entries(contractStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select name="tipo" defaultValue={tipo ?? ""} className={selectClass}>
            <option value="">Contratos e documentos</option>
            <option value="CONTRATO">Só contratos</option>
            <option value="DOCUMENTO">Só documentos</option>
          </select>
          <select name="vence" defaultValue={vence ?? ""} className={selectClass}>
            <option value="">Qualquer vencimento</option>
            <option value="30">Vence/reajusta em 30 dias</option>
            <option value="60">Vence/reajusta em 60 dias</option>
          </select>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </FilterDrawer>

      <ActiveFilter label={filterLabel || null} clearHref="/juridico/contratos" />

      <Card className="table-scroll hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nº</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Serviço</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Vencimento / reajuste</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contracts.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                  <Link href={`/juridico/contratos/${c.id}`} className="hover:underline">
                    {c.code}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{displayClientName(c.client)}</td>
                <td className="px-4 py-3 text-slate-600">{c.service?.name ?? c.title}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{contractValue(c)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateBR(c.createdAt)}</td>
                <td className="px-4 py-3">
                  <Badge tone={contractStatusTone[c.status]}>{contractStatusLabels[c.status]}</Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{contractNextDate(c)}</td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Nenhum contrato encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <TableCardList>
        {contracts.map((c) => (
          <TableCard
            key={c.id}
            href={`/juridico/contratos/${c.id}`}
            title={`${c.code} — ${displayClientName(c.client)}`}
            subtitle={c.service?.name ?? c.title}
            fields={[
              { label: "Status", value: <Badge tone={contractStatusTone[c.status]}>{contractStatusLabels[c.status]}</Badge> },
              { label: "Valor", value: contractValue(c) },
              { label: "Data", value: formatDateBR(c.createdAt) },
              { label: "Vencimento", value: contractNextDate(c) },
            ]}
          />
        ))}
        {contracts.length === 0 && <TableCardEmpty>Nenhum contrato encontrado.</TableCardEmpty>}
      </TableCardList>
    </div>
  );
}
