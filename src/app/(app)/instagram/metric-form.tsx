"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InstagramMetricFormState } from "./actions";

type MetricDefaults = Partial<{
  date: string;
  followers: string;
  posts: string;
  likes: string;
  comments: string;
  shares: string;
  reach: string;
  profileVisits: string;
  notes: string;
}>;

export function InstagramMetricForm({
  action,
  defaults,
  submitLabel = "Salvar registro",
}: {
  action: (
    prevState: InstagramMetricFormState,
    formData: FormData,
  ) => Promise<InstagramMetricFormState>;
  defaults?: MetricDefaults;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Registro de métricas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Data *</Label>
            <Input type="date" name="date" defaultValue={defaults?.date} />
            {fieldError("date") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("date")}</p>
            )}
          </div>
          <div>
            <Label>Seguidores (total) *</Label>
            <Input
              type="number"
              min="0"
              name="followers"
              defaultValue={defaults?.followers}
            />
            {fieldError("followers") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("followers")}</p>
            )}
          </div>
          <div>
            <Label>Publicações no período</Label>
            <Input type="number" min="0" name="posts" defaultValue={defaults?.posts} />
          </div>
          <div>
            <Label>Contas alcançadas</Label>
            <Input type="number" min="0" name="reach" defaultValue={defaults?.reach} />
          </div>
          <div>
            <Label>Curtidas</Label>
            <Input type="number" min="0" name="likes" defaultValue={defaults?.likes} />
          </div>
          <div>
            <Label>Comentários</Label>
            <Input type="number" min="0" name="comments" defaultValue={defaults?.comments} />
          </div>
          <div>
            <Label>Compartilhamentos</Label>
            <Input type="number" min="0" name="shares" defaultValue={defaults?.shares} />
          </div>
          <div>
            <Label>Visitas ao perfil</Label>
            <Input
              type="number"
              min="0"
              name="profileVisits"
              defaultValue={defaults?.profileVisits}
            />
          </div>
          <div className="col-span-2">
            <Label>Observações / estratégia do período</Label>
            <Textarea
              name="notes"
              rows={3}
              placeholder="Ex.: campanha de Reels sobre MEI, parceria com influenciador, etc."
              defaultValue={defaults?.notes}
            />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
