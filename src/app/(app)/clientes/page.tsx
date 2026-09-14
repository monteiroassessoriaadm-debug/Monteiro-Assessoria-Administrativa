import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { onlyDigits } from "@/lib/utils";
import { displayClientName, displayClientDocument } from "@/lib/client-display";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const qDigits = q ? onlyDigits(q) : "";

  const clients = await prisma.client.findMany({
    where: {
      ...(status ? { status: status as "ATIVO" | "INATIVO" } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q } },
              { legalName: { contains: q } },
              { tradeName: { contains: q } },
              ...(qDigits ? [{ cpf: { contains: qDigits } }, { cnpj: { contains: qDigits } }] : []),
              { whatsapp: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">
            Cadastro único — reutilizado em todo o sistema.
          </p>
        </div>
        <Link href="/clientes/novo">
          <Button>
            <Plus className="h-4 w-4" /> Novo cliente
          </Button>
        </Link>
      </div>

      <form className="flex gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome, CPF/CNPJ, WhatsApp, e-mail..."
            className="pl-9"
          />
        </div>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="ATIVO">Ativos</option>
          <option value="INATIVO">Inativos</option>
        </select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Cidade</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/clientes/${c.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {displayClientName(c)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {displayClientDocument(c)}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.whatsapp ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.addressCity ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={c.status === "ATIVO" ? "green" : "slate"}>
                    {c.status === "ATIVO" ? "Ativo" : "Inativo"}
                  </Badge>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
