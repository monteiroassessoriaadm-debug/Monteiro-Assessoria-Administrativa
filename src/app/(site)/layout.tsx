import Link from "next/link";
import { Camera, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { onlyDigits } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.companySettings.findFirst({
    select: { name: true, slogan: true, about: true },
  });
  const name = settings?.name ?? "Monteiro Assessoria Administrativa";
  const description =
    settings?.about ??
    settings?.slogan ??
    "Assessoria administrativa completa: documentos, contratos, abertura de MEI, mídia e muito mais.";

  return {
    title: { default: name, template: `%s | ${name}` },
    description,
    openGraph: {
      title: name,
      description,
      siteName: name,
      type: "website",
    },
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, session] = await Promise.all([
    prisma.companySettings.findFirst({
      select: { name: true, slogan: true, logoData: true, whatsapp: true, instagram: true },
    }),
    getSession(),
  ]);

  const whatsappDigits = settings?.whatsapp ? onlyDigits(settings.whatsapp) : null;
  const whatsappLink = whatsappDigits ? `https://wa.me/55${whatsappDigits}` : null;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            {settings?.logoData ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URI logo uploaded by the admin, no fixed dimensions
              <img src={settings.logoData} alt={settings.name ?? "Logo"} className="h-10 max-w-full object-contain" />
            ) : (
              <span className="text-lg font-bold text-[#d4af37]">
                {settings?.name ?? "Monteiro Assessoria Administrativa"}
              </span>
            )}
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-neutral-300 md:flex">
            <Link href="/" className="hover:text-[#d4af37]">
              Início
            </Link>
            <Link href="/nossos-servicos" className="hover:text-[#d4af37]">
              Serviços
            </Link>
            <Link href="/contato" className="hover:text-[#d4af37]">
              Contato
            </Link>
          </nav>
          <Link
            href={session ? "/dashboard" : "/login"}
            className="rounded-lg border border-[#d4af37]/40 px-4 py-2 text-sm font-medium text-[#d4af37] transition-colors hover:bg-[#d4af37]/10"
          >
            {session ? "Ir para o CRM" : "Entrar"}
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/10 bg-black">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              {settings?.name ?? "Monteiro Assessoria Administrativa"}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              {settings?.slogan ?? "A Monteiro Resolve."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-neutral-300 hover:text-[#d4af37]"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
            {settings?.instagram && (
              <a
                href={`https://instagram.com/${settings.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-neutral-300 hover:text-[#d4af37]"
              >
                <Camera className="h-4 w-4" /> {settings.instagram}
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
