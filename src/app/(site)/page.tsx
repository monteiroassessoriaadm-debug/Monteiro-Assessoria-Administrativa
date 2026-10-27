import Link from "next/link";
import { MessageCircle, ArrowRight, ShieldCheck, Clock, HandHeart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { onlyDigits } from "@/lib/utils";
import { iconForCategory } from "./site-icons";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, services] = await Promise.all([
    prisma.companySettings.findFirst(),
    prisma.service.findMany({ where: { active: true } }),
  ]);

  const whatsappDigits = settings?.whatsapp ? onlyDigits(settings.whatsapp) : null;
  const whatsappLink = whatsappDigits
    ? `https://wa.me/55${whatsappDigits}?text=${encodeURIComponent("Olá! Vi o site da Monteiro e queria saber mais.")}`
    : null;

  const categories = [...new Set(services.map((s) => s.category).filter(Boolean))] as string[];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[#d4af37]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-40 h-96 w-96 rounded-full bg-[#d4af37]/5 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 md:py-28">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#d4af37]">
            {settings?.name ?? "Monteiro Assessoria Administrativa"}
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight text-white md:text-5xl">
            {settings?.slogan ?? "A Monteiro Resolve."}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-neutral-300">
            Documentos, contratos, abertura de MEI, mídia e tudo que envolve burocracia e
            organização no seu dia a dia — resolvido de um jeito simples, sem complicação.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/nossos-servicos"
              className="flex items-center gap-2 rounded-lg bg-[#d4af37] px-6 py-3 text-sm font-semibold text-neutral-950 transition-opacity hover:opacity-90"
            >
              Ver serviços <ArrowRight className="h-4 w-4" />
            </Link>
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Quem somos */}
      {settings?.about && (
        <section className="border-t border-white/10 bg-black/40">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#d4af37]">
              Quem somos
            </p>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-neutral-200">
              {settings.about}
            </p>
          </div>
        </section>
      )}

      {/* Diferenciais */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Clock,
              title: "Rápido e sem burocracia",
              text: "Processos simples resolvidos em poucos dias, sem você precisar entender de leis ou formulários.",
            },
            {
              icon: HandHeart,
              title: "Atenção individual",
              text: "Cada caso é diferente — tratamos o seu com atenção, do mais simples ao mais complexo.",
            },
            {
              icon: ShieldCheck,
              title: "Não achou o que precisa?",
              text: "A gente resolve muito mais do que uma lista de serviços mostra. Se tem dúvida, é só perguntar.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <item.icon className="h-8 w-8 text-[#d4af37]" />
              <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-neutral-400">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categorias de serviço */}
      {categories.length > 0 && (
        <section className="border-t border-white/10 bg-black/40">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#d4af37]">
              O que fazemos
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {categories.map((category) => {
                const Icon = iconForCategory(category);
                return (
                  <Link
                    key={category}
                    href="/nossos-servicos"
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-neutral-200 transition-colors hover:border-[#d4af37]/40 hover:bg-white/10"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-[#d4af37]" />
                    {category}
                  </Link>
                );
              })}
            </div>
            <Link
              href="/nossos-servicos"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#d4af37] hover:underline"
            >
              Ver todos os serviços <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-[#d4af37]/10 to-transparent p-10 text-center">
          <h2 className="text-2xl font-bold text-white">Não encontrou exatamente o que precisa?</h2>
          <p className="mx-auto mt-3 max-w-xl text-neutral-300">
            A Monteiro faz muito mais do que essa página mostra. Atendemos praticamente qualquer
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
      </section>
    </div>
  );
}
