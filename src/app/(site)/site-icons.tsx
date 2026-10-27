import {
  FileText,
  Building2,
  Megaphone,
  Briefcase,
  Laptop,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  documentos: FileText,
  administrativo: Building2,
  "mídia": Megaphone,
  midia: Megaphone,
  consultoria: Briefcase,
  digital: Laptop,
  "prestação de serviços": GraduationCap,
  "prestacao de servicos": GraduationCap,
  "acadêmico": GraduationCap,
  academico: GraduationCap,
};

export function iconForCategory(category: string | null | undefined): LucideIcon {
  if (!category) return Briefcase;
  return CATEGORY_ICONS[category.trim().toLowerCase()] ?? Briefcase;
}
