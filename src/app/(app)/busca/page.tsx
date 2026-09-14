import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { displayClientName } from "@/lib/client-display";
import { onlyDigits, maskPhone } from "@/lib/utils";

type ResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

function ResultSection({
  title,
  items,
}: {
  title: string;
  items: ResultItem[];
}) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge tone="slate">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
          >
            <div>
              <p className="font-medium text-slate-900">{item.title}</p>
              {item.subtitle && <p className="text-xs text-slate-500">{item.subtitle}</p>}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireRole(Role.ADMIN, Role.GESTOR, Role.BIA);
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const digits = onlyDigits(query);
  // Telefone/WhatsApp do cliente são salvos já mascarados (ex.: "(11) 93333-2222"),
  // então buscar pelos dígitos puros não bate — reaplicamos a mesma máscara do
  // formulário para comparar com o valor realmente salvo.
  const maskedPhone = digits.length >= 8 ? maskPhone(digits) : null;

  if (!query) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Busca</h1>
          <p className="text-sm text-slate-500">
            Encontre clientes, leads, prospecções e serviços por nome, documento, telefone ou
            e-mail.
          </p>
        </div>
        <Card className="flex flex-col items-center gap-2 p-10 text-center text-sm text-slate-400">
          <SearchIcon className="h-6 w-6" />
          Digite um termo na busca no topo da tela para começar.
        </Card>
      </div>
    );
  }

  const [clients, leads, prospects, services] = await Promise.all([
    prisma.client.findMany({
      where: {
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { legalName: { contains: query, mode: "insensitive" } },
          { tradeName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          ...(digits.length >= 3 ? [{ cpf: { contains: digits } }, { cnpj: { contains: digits } }] : []),
          ...(maskedPhone
            ? [{ whatsapp: { contains: maskedPhone } }, { phone: { contains: maskedPhone } }]
            : []),
        ],
      },
      take: 15,
      orderBy: { createdAt: "desc" },
    }),
    prisma.lead.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { instagram: { contains: query, mode: "insensitive" } },
          ...(digits.length >= 3 ? [{ whatsapp: { contains: digits } }, { phone: { contains: digits } }] : []),
        ],
      },
      take: 15,
      orderBy: { createdAt: "desc" },
    }),
    prisma.prospectingEntry.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { contactName: { contains: query, mode: "insensitive" } },
          { instagram: { contains: query, mode: "insensitive" } },
          ...(digits.length >= 3 ? [{ whatsapp: { contains: digits } }] : []),
        ],
      },
      take: 15,
      orderBy: { createdAt: "desc" },
    }),
    prisma.service.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 15,
      orderBy: { name: "asc" },
    }),
  ]);

  const canSeeUsers = session.role === "ADMIN";
  const users = canSeeUsers
    ? await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 15,
        orderBy: { name: "asc" },
      })
    : [];

  const totalResults =
    clients.length + leads.length + prospects.length + services.length + users.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Resultados para &quot;{query}&quot;</h1>
        <p className="text-sm text-slate-500">
          {totalResults} {totalResults === 1 ? "resultado encontrado" : "resultados encontrados"}
        </p>
      </div>

      {totalResults === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">
          Nenhum resultado encontrado para este termo.
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <ResultSection
            title="Clientes"
            items={clients.map((c) => ({
              id: c.id,
              title: displayClientName(c),
              subtitle: c.whatsapp || c.email || undefined,
              href: `/clientes/${c.id}`,
            }))}
          />
          <ResultSection
            title="Leads"
            items={leads.map((l) => ({
              id: l.id,
              title: l.name,
              subtitle: l.whatsapp || l.instagram || undefined,
              href: `/leads/${l.id}`,
            }))}
          />
          <ResultSection
            title="Prospecções"
            items={prospects.map((p) => ({
              id: p.id,
              title: p.name,
              subtitle: p.contactName || p.whatsapp || undefined,
              href: `/prospeccao/${p.id}`,
            }))}
          />
          <ResultSection
            title="Serviços (catálogo)"
            items={services.map((s) => ({
              id: s.id,
              title: s.name,
              subtitle: s.category || undefined,
              href: "/servicos",
            }))}
          />
          {canSeeUsers && (
            <ResultSection
              title="Usuários"
              items={users.map((u) => ({
                id: u.id,
                title: u.name,
                subtitle: u.email,
                href: `/usuarios/${u.id}/editar`,
              }))}
            />
          )}
        </div>
      )}
    </div>
  );
}
