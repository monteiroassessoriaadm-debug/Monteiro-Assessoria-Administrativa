import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Clock, HandHeart, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Quem Somos" };

const DIFERENCIAIS = [
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
];

export default async function SobrePage() {
  const settings = await prisma.companySettings.findFirst();

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[#d4af37]/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-5 py-16 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#d4af37]">
            Quem somos
          </p>
          {settings?.logoData && (
            // eslint-disable-next-line @next/next/no-img-element -- data URI logo uploaded by the admin, no fixed dimensions
            <img
              src={settings.logoData}
              alt={settings.name ?? "Logo"}
              className="mt-6 h-16 max-w-full object-contain"
            />
          )}
          <p className="mt-8 text-xl leading-relaxed text-neutral-200 md:text-2xl">
            {settings?.about ??
              "A Monteiro Assessoria Administrativa cuida da burocracia pra você não precisar."}
          </p>
        </div>
      </section>

      <section className="border-t border-white/10 bg-black/40">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {DIFERENCIAIS.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <item.icon className="h-8 w-8 text-[#d4af37]" />
                <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-neutral-400">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-[#d4af37]/10 to-transparent p-10 text-center">
          <h2 className="text-2xl font-bold text-white">Quer saber se a gente resolve o seu caso?</h2>
          <p className="mx-auto mt-3 max-w-xl text-neutral-300">
            Dê uma olhada nos serviços ou fale direto com a gente — sem compromisso.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/nossos-servicos"
              className="flex items-center gap-2 rounded-lg bg-[#d4af37] px-6 py-3 text-sm font-semibold text-neutral-950 transition-opacity hover:opacity-90"
            >
              Ver serviços <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contato"
              className="flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Fale com a gente <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
