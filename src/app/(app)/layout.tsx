import { requireSession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { isPfOwner } from "@/lib/pf/access";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const [settings, showPersonal] = await Promise.all([
    prisma.companySettings.findFirst({ select: { name: true, logoData: true } }),
    isPfOwner(session.userId),
  ]);

  return (
    <AppShell
      role={session.role}
      companyName={settings?.name}
      logoData={settings?.logoData}
      name={session.name}
      showPersonal={showPersonal}
    >
      {children}
    </AppShell>
  );
}
