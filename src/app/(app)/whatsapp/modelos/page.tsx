import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleWhatsAppTemplateActiveButton } from "./toggle-active-button";

export default async function WhatsAppModelosPage() {
  await requireRole(Role.ADMIN, Role.GESTOR);

  const templates = await prisma.whatsAppTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Modelos de mensagem (WhatsApp)</h1>
          <p className="text-sm text-slate-500">
            Biblioteca de mensagens prontas com os dados do cliente. Não há envio automático —
            o envio continua pelo WhatsApp normal, usando o texto gerado aqui.
          </p>
        </div>
        <Link href="/whatsapp/modelos/novo">
          <Button>
            <Plus className="h-4 w-4" /> Novo modelo
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {templates.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                <td className="px-4 py-3 text-slate-600">{t.category ?? "-"}</td>
                <td className="px-4 py-3">
                  <Badge tone={t.active ? "green" : "slate"}>
                    {t.active ? "Ativo" : "Inativo"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/whatsapp/modelos/${t.id}/editar`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <ToggleWhatsAppTemplateActiveButton templateId={t.id} active={t.active} />
                  </div>
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  Nenhum modelo cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
