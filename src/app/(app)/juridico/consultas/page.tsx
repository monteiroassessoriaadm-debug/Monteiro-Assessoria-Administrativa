import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeBR } from "@/lib/utils";
import { displayClientName } from "@/lib/client-display";

export default async function ConsultasPage() {
  const items = await prisma.legalConsultation.findMany({
    include: { client: true, contract: true, createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Consultas e orientações</h1>
          <p className="text-sm text-slate-500">
            Histórico das dúvidas jurídicas da empresa e do que foi orientado. O Jurídico é um assistente, não substitui advogado.
          </p>
        </div>
        <Link href="/juridico/consultas/novo">
          <Button>
            <Plus className="h-4 w-4" /> Registrar orientação
          </Button>
        </Link>
      </div>

      {items.length === 0 && <p className="text-sm text-slate-400">Nenhuma orientação registrada ainda.</p>}

      {items.map((c) => (
        <Card key={c.id}>
          <CardContent className="space-y-2 pt-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="break-words font-semibold text-slate-900">{c.topic}</p>
              {c.needsLawyer && <Badge tone="red">Levar a um advogado</Badge>}
            </div>
            <p className="text-xs text-slate-500">
              {formatDateTimeBR(c.createdAt)}
              {c.createdBy ? ` · ${c.createdBy.name}` : ""}
              {c.client ? (
                <>
                  {" · "}
                  <Link href={`/clientes/${c.client.id}`} className="underline">
                    {displayClientName(c.client)}
                  </Link>
                </>
              ) : null}
              {c.contract ? (
                <>
                  {" · "}
                  <Link href={`/juridico/contratos/${c.contract.id}`} className="underline">
                    {c.contract.code}
                  </Link>
                </>
              ) : null}
            </p>
            <details>
              <summary className="cursor-pointer py-2 text-sm font-medium text-slate-700">Ver dúvida e orientação</summary>
              <p className="mt-1 text-xs font-semibold uppercase text-slate-500">Dúvida</p>
              <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{c.question}</p>
              <p className="mt-3 text-xs font-semibold uppercase text-slate-500">Orientação</p>
              <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{c.guidance}</p>
            </details>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
