import { requireSession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

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
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar role={session.role} companyName={settings?.name} logoData={settings?.logoData} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar name={session.name} role={session.role} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
