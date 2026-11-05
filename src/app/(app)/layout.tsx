import { requireSession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const settings = await prisma.companySettings.findFirst({
    select: { name: true, logoData: true },
  });

  return (
    <AppShell
      role={session.role}
      companyName={settings?.name}
      logoData={settings?.logoData}
      name={session.name}
    >
      {children}
    </AppShell>
  );
}
