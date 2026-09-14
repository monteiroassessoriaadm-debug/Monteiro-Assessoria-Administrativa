"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { decideMediaContentApprovalAction } from "../actions";

export function MediaContentApprovalForm({ contentId }: { contentId: string }) {
  const approve = decideMediaContentApprovalAction.bind(null, contentId, true);
  const reject = decideMediaContentApprovalAction.bind(null, contentId, false);

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="border-amber-100">
        <CardTitle className="text-amber-800">Aguardando aprovação</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3">
          <div>
            <Label>Observações (opcional)</Label>
            <Textarea name="approvalNotes" rows={2} />
          </div>
          <div className="flex gap-2">
            <Button formAction={approve} type="submit">
              Aprovar
            </Button>
            <Button formAction={reject} type="submit" variant="danger">
              Reprovar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
