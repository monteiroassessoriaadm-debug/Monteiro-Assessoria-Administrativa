"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { contractStatusLabels } from "@/lib/lead-labels";
import { changeContractStatusAction } from "../../actions";
import type { ContractStatus } from "@/generated/prisma/enums";

const BUTTON_LABEL: Partial<Record<ContractStatus, string>> = {
  ENVIADO: "Marcar como enviado",
  ASSINADO: "Marcar como assinado",
  VIGENTE: "Marcar como vigente",
  RASCUNHO: "Voltar para rascunho",
  ENCERRADO: "Encerrar",
  RESCINDIDO: "Rescindir",
};

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function ContractStatusActions({
  contractId,
  status,
  allowed,
}: {
  contractId: string;
  status: ContractStatus;
  allowed: ContractStatus[];
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<ContractStatus | null>(null);
  const [note, setNote] = useState("");
  const [signedAt, setSignedAt] = useState(todayKey());
  const [method, setMethod] = useState("gov.br");
  const [error, setError] = useState<string | null>(null);
  const [agenda, setAgenda] = useState<string[] | null>(null);

  if (allowed.length === 0) return null;

  function run(to: ContractStatus) {
    setError(null);
    startTransition(async () => {
      const res = await changeContractStatusAction(contractId, to, {
        note: note || undefined,
        ...(to === "ASSINADO" ? { signedAt, signatureMethod: method } : {}),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(null);
      setNote("");
      if (res.agenda) setAgenda(res.agenda);
    });
  }

  const needsForm = (to: ContractStatus) =>
    to === "ASSINADO" || ((to === "ENCERRADO" || to === "RESCINDIDO") && status !== "RASCUNHO") || to === "RASCUNHO";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {allowed.map((to) => (
          <Button
            key={to}
            size="sm"
            variant={to === "ENCERRADO" || to === "RESCINDIDO" ? "danger" : to === "RASCUNHO" ? "outline" : "primary"}
            disabled={pending}
            onClick={() => (needsForm(to) ? setOpen(open === to ? null : to) : run(to))}
          >
            {to === "ENCERRADO" && status === "RASCUNHO" ? "Cancelar rascunho" : BUTTON_LABEL[to]}
          </Button>
        ))}
      </div>

      {open && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-800">
            {contractStatusLabels[status]} → {contractStatusLabels[open]}
          </p>
          {open === "ASSINADO" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="signedAt">Data da assinatura</Label>
                <Input id="signedAt" type="date" value={signedAt} onChange={(e) => setSignedAt(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="method">Como foi assinado</Label>
                <Select id="method" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="gov.br">Assinatura gov.br</option>
                  <option value="presencial">Assinado no papel</option>
                  <option value="outra">Outra assinatura eletrônica</option>
                </Select>
              </div>
              <p className="text-xs text-slate-500 sm:col-span-2">
                Ao confirmar, os vencimentos das contas a receber ligadas, o aviso de reajuste e o fim do contrato entram na agenda.
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="note">
              {open === "ENCERRADO" || open === "RESCINDIDO" ? "Motivo *" : "Observação"}
            </Label>
            <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={pending} onClick={() => run(open)}>
              {pending ? "Salvando..." : "Confirmar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(null)}>
              Voltar
            </Button>
          </div>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {agenda && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {agenda.length === 0 ? (
            "Nenhum vencimento novo para pôr na agenda."
          ) : (
            <>
              <p className="font-medium">Na agenda:</p>
              <ul className="list-disc pl-5">
                {agenda.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
