"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { publishMediaContentAction } from "../actions";

export function MediaContentPublishForm({ contentId }: { contentId: string }) {
  const publish = publishMediaContentAction.bind(null, contentId);

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader className="border-purple-100">
        <CardTitle className="text-purple-800">Aprovado — pronto para publicar</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={publish} className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <Label>Link do conteúdo publicado (opcional)</Label>
            <Input name="link" placeholder="https://instagram.com/p/..." />
          </div>
          <Button type="submit">Marcar como publicado</Button>
        </form>
      </CardContent>
    </Card>
  );
}
