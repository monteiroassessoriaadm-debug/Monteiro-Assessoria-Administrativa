import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";

// Fetches company settings (logo/slogan) per request — must not be
// statically prerendered, or a logo uploaded later would never show up
// without a full rebuild.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await prisma.companySettings.findFirst({
    select: { name: true, slogan: true, logoData: true },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {settings?.logoData ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URI logo uploaded by the admin, no fixed dimensions */}
              <img
                src={settings.logoData}
                alt={settings.name ?? "Logo"}
                className="h-20 max-w-full object-contain"
              />
              {settings.slogan && (
                <p className="text-sm text-slate-400">{settings.slogan}</p>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                {settings?.name ?? "Monteiro Assessoria Administrativa"}
              </p>
              <h1 className="mt-2 text-2xl font-bold text-white">
                Monteiro CRM
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {settings?.slogan ?? "A Monteiro Resolve."}
              </p>
            </>
          )}
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
