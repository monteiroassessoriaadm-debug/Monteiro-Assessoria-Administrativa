import Link from "next/link";
import { ArrowRight, Check, ExternalLink, Globe } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatCurrencyBRL } from "@/lib/utils";
import { iconForCategory } from "../site-icons";
import { CRIACAO_DE_SITES, isCriacaoDeSites } from "../criacao-de-sites";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nossos Serviços" };

function priceLabel(service: {
  pricingMode: string;
  defaultPrice: unknown;
}) {
  const price = service.defaultPrice ? formatCurrencyBRL((service.defaultPrice as { toString(): string }).toString()) : null;

  if (service.pricingMode === "ORCAMENTO") return "Sob orçamento";
  if (service.pricingMode === "A_PARTIR_DE") return price ? `A partir de ${price}` : "Sob orçamento";
  return price ?? "Sob orçamento";
}

export default async function NossosServicosPage() {
  const allServices = await prisma.service.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  // Criação de Sites tem card próprio (confecção + manutenção mensal juntas)
  const services = allServices.filter((s) => !isCriacaoDeSites(s.name));
  const confeccao = allServices.find((s) => s.name === CRIACAO_DE_SITES.nomeConfeccao);
  const manutencao = allServices.find((s) => s.name === CRIACAO_DE_SITES.nomeManutencao);
  const precoConfeccao = formatCurrencyBRL(
    confeccao?.defaultPrice?.toString() ?? CRIACAO_DE_SITES.precoConfeccao,
  );
  const precoManutencao = formatCurrencyBRL(
    manutencao?.defaultPrice?.toString() ?? CRIACAO_DE_SITES.precoManutencao,
  );

  const porCategoria = new Map<string, typeof services>();
  for (const s of services) {
    const cat = s.category ?? "Outros serviços";
    porCategoria.set(cat, [...(porCategoria.get(cat) ?? []), s]);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#d4af37]">
        Nossos serviços
      </p>
      <h1 className="mt-3 max-w-2xl text-3xl font-bold text-white md:text-4xl">
        O que a Monteiro pode resolver pra você
      </h1>
      <p className="mt-4 max-w-2xl text-neutral-400">
        Alguns dos serviços mais procurados — mas não é uma lista fechada. Se você tem uma
        necessidade administrativa e não sabe nem por onde começar, fale com a gente.
      </p>

      <div className="mt-12 space-y-12">
        <div>
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-[#d4af37]" />
            <h2 className="text-xl font-semibold text-white">{CRIACAO_DE_SITES.categoria}</h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5 sm:col-span-2">
              <h3 className="font-semibold text-white">Criação de Sites</h3>
              <p className="mt-2 text-sm text-neutral-400">{CRIACAO_DE_SITES.descricao}</p>

              <div className="mt-4 grid flex-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-[#d4af37]">
                    Confecção: {precoConfeccao}
                  </p>
                  <p className="text-xs text-neutral-500">Pagamento único</p>
                  <ul className="mt-2 space-y-1">
                    {CRIACAO_DE_SITES.incluiConfeccao.map((item) => (
                      <li key={item} className="flex gap-2 text-sm text-neutral-400">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d4af37]" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#d4af37]">
                    Manutenção: {precoManutencao}/mês
                  </p>
                  <p className="text-xs text-neutral-500">Opcional</p>
                  <ul className="mt-2 space-y-1">
                    {CRIACAO_DE_SITES.incluiManutencao.map((item) => (
                      <li key={item} className="flex gap-2 text-sm text-neutral-400">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d4af37]" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <a
                  href={CRIACAO_DE_SITES.exemplo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-medium text-neutral-300 hover:text-[#d4af37]"
                >
                  Ver exemplo: {CRIACAO_DE_SITES.exemplo.nome}{" "}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <Link
                  href={confeccao ? `/contato?servico=${confeccao.id}` : "/contato"}
                  className="flex items-center gap-1 text-xs font-medium text-neutral-300 hover:text-[#d4af37]"
                >
                  Solicitar <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {[...porCategoria.entries()].map(([categoria, items]) => {
          const Icon = iconForCategory(categoria);
          return (
            <div key={categoria}>
              <div className="flex items-center gap-3">
                <Icon className="h-6 w-6 text-[#d4af37]" />
                <h2 className="text-xl font-semibold text-white">{categoria}</h2>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((service) => (
                  <div
                    key={service.id}
                    className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <h3 className="font-semibold text-white">{service.name}</h3>
                    {service.description && (
                      <p className="mt-2 flex-1 text-sm text-neutral-400">{service.description}</p>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#d4af37]">
                        {priceLabel(service)}
                      </span>
                      <Link
                        href={`/contato?servico=${service.id}`}
                        className="flex items-center gap-1 text-xs font-medium text-neutral-300 hover:text-[#d4af37]"
                      >
                        Solicitar <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-16 rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-[#d4af37]/10 to-transparent p-10 text-center">
        <h2 className="text-2xl font-bold text-white">Não encontrou exatamente o que precisa?</h2>
        <p className="mx-auto mt-3 max-w-xl text-neutral-300">
          A Monteiro faz muito mais do que essa lista mostra. Atendemos praticamente qualquer
          necessidade administrativa, documental ou de apoio ao seu negócio — e se não for algo
          que a gente resolve diretamente, te orientamos pra quem pode ajudar.
        </p>
        <Link
          href="/contato"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-6 py-3 text-sm font-semibold text-neutral-950 transition-opacity hover:opacity-90"
        >
          Fale com a gente <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
