import { requirePfOwner } from "@/lib/pf/access";
import { PfTabs } from "./tabs";

// Cada página e ação confere o dono de novo; este layout só evita montar a aba
// para quem não é.
export default async function FinancasPessoaisLayout({ children }: { children: React.ReactNode }) {
  await requirePfOwner();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Finanças Pessoais</h1>
        <p className="text-sm text-slate-500">Sua vida financeira de pessoa física. Nada daqui entra nos números da Monteiro.</p>
      </div>
      <PfTabs />
      {children}
    </div>
  );
}
