import { MessageCircle, Camera } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { onlyDigits } from "@/lib/utils";
import { ContactForm } from "./contact-form";

export const dynamic = "force-dynamic";

export default async function ContatoPage({
  searchParams,
}: {
  searchParams: Promise<{ servico?: string }>;
}) {
  const { servico } = await searchParams;
  const [settings, servicos] = await Promise.all([
    prisma.companySettings.findFirst(),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const whatsappDigits = settings?.whatsapp ? onlyDigits(settings.whatsapp) : null;
  const whatsappLink = whatsappDigits ? `https://wa.me/55${whatsappDigits}` : null;

  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#d4af37]">Contato</p>
      <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">Vamos resolver isso juntos</h1>
      <p className="mt-4 max-w-xl text-neutral-400">
        Preenche o formulário ou chama a gente direto no WhatsApp — o que for mais fácil pra você.
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-neutral-200 hover:border-[#d4af37]/40"
            >
              <MessageCircle className="h-5 w-5 text-[#d4af37]" /> {settings?.whatsapp}
            </a>
          )}
          {settings?.instagram && (
            <a
              href={`https://instagram.com/${settings.instagram.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-neutral-200 hover:border-[#d4af37]/40"
            >
              <Camera className="h-5 w-5 text-[#d4af37]" /> {settings.instagram}
            </a>
          )}
        </div>

        <ContactForm servicos={servicos} servicoSelecionado={servico} />
      </div>
    </div>
  );
}
