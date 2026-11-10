"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContractFieldDef } from "@/lib/contract-render";
import { ContractFields } from "../../../contract-fields";
import type { JuridicoFormState } from "../../../actions";

export function EditContractForm({
  action,
  fields,
  values: initialValues,
  title,
  notes,
  renderedContent,
  sent,
}: {
  action: (prev: JuridicoFormState, formData: FormData) => Promise<JuridicoFormState>;
  fields: ContractFieldDef[];
  values: Record<string, string>;
  title: string;
  notes: string;
  renderedContent: string;
  sent: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [mode, setMode] = useState<"campos" | "texto">(fields.length ? "campos" : "texto");
  const [values, setValues] = useState(initialValues);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="values" value={JSON.stringify(values)} />

      {sent && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Este contrato já foi enviado. Ao salvar uma mudança no texto, ele volta para rascunho e precisa ser reenviado ao cliente.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Geral</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" defaultValue={title} />
          </div>
          <div>
            <Label htmlFor="notes">Observações internas</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={notes} />
          </div>
          <div>
            <Label htmlFor="reason">O que mudou (fica no histórico de versões)</Label>
            <Input id="reason" name="reason" placeholder="Ex.: ajuste no prazo de entrega" />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="button" size="sm" variant={mode === "campos" ? "primary" : "outline"} onClick={() => setMode("campos")} disabled={!fields.length}>
          Alterar campos
        </Button>
        <Button type="button" size="sm" variant={mode === "texto" ? "primary" : "outline"} onClick={() => setMode("texto")}>
          Editar o texto à mão
        </Button>
      </div>

      {mode === "campos" ? (
        <Card>
          <CardHeader>
            <CardTitle>Campos</CardTitle>
          </CardHeader>
          <CardContent>
            <ContractFields fields={fields} values={values} onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))} />
            <p className="mt-4 text-xs text-slate-500">O texto é montado de novo a partir do modelo com os valores acima.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Texto do contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea name="renderedContent" rows={24} className="text-sm" defaultValue={renderedContent} />
            <p className="mt-2 text-xs text-slate-500">
              Linhas começando com &quot;CLÁUSULA&quot; viram títulos no PDF. Deixe uma linha em branco entre parágrafos.
            </p>
          </CardContent>
        </Card>
      )}

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar nova versão"}
        </Button>
      </div>
    </form>
  );
}
