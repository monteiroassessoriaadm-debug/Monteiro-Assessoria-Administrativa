"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteProspectAction, mergeProspectAction } from "../actions";

export function DeleteProspectButton({ prospectId }: { prospectId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Excluir esta ficha? Uma cópia fica guardada no Histórico.")) return;
          startTransition(async () => setError(await deleteProspectAction(prospectId)));
        }}
      >
        <Trash2 className="h-4 w-4" /> Excluir
      </Button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </>
  );
}

export function MergeProspects({
  keepId,
  candidates,
}: {
  keepId: string;
  candidates: { id: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (candidates.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="border-amber-100">
        <CardTitle className="text-amber-800">Possível ficha duplicada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-amber-900">
          Mesclar traz para esta ficha o que a outra tem e mantém as observações das duas.
        </p>
        {candidates.map((c) => (
          <div
            key={c.id}
            className="flex flex-col gap-2 rounded-lg bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="min-w-0 break-words text-sm text-slate-800">{c.label}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              className="shrink-0"
              onClick={() => {
                if (!window.confirm("Mesclar a outra ficha nesta? A cópia dela fica guardada no Histórico.")) return;
                startTransition(async () => setError(await mergeProspectAction(keepId, c.id)));
              }}
            >
              Mesclar nesta ficha
            </Button>
          </div>
        ))}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
