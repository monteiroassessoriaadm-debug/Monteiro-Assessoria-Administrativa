import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL não configurada (string de conexão do Postgres).");
}
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const DEFAULT_SERVICES = [
  { name: "Apoio para abertura de MEI", category: "Administrativo" },
  { name: "Elaboração de contratos", category: "Documentos" },
  { name: "Documentos administrativos", category: "Documentos" },
  { name: "Currículos", category: "Documentos" },
  { name: "Serviços digitais", category: "Digital" },
  { name: "Slides e apresentações", category: "Digital" },
  { name: "Edição de vídeos", category: "Digital" },
  { name: "Impressões", category: "Administrativo" },
  { name: "Consultoria / assessoria administrativa", category: "Consultoria" },
  { name: "Assessoria de mídia", category: "Mídia" },
  // Criação de Sites: confecção (única) e manutenção mensal (opcional) são itens
  // separados para poderem ser lançados e cobrados de forma independente.
  // (A migração 20261029120000 também cria um item "Criação de Sites" sob orçamento;
  // o site público mostra o serviço num card só, sem repetir esse item.)
  {
    name: "Criação de Sites — Confecção",
    category: "Criação de Sites",
    defaultPrice: 350,
    pricingMode: "FIXO" as const,
    description:
      "Pagamento único. Site responsivo (feito para celular) com apresentação, serviços e preços, portfólio, redes sociais e pré-agendamento que envia a mensagem pronta para o WhatsApp do cliente, publicação na internet e QR Codes para divulgação.",
    checklistTemplate: JSON.stringify([
      "Briefing com o cliente (serviços, preços, fotos, redes sociais, endereço)",
      "Montar o site",
      "Testar o pré-agendamento no WhatsApp",
      "Aprovação do cliente",
      "Publicar na internet",
      "Gerar e entregar os QR Codes",
    ]),
  },
  {
    name: "Criação de Sites — Manutenção mensal",
    category: "Criação de Sites",
    defaultPrice: 80,
    pricingMode: "FIXO" as const,
    description:
      "Opcional, cobrança mensal. Atualização de preços, fotos, serviços, horários e textos, ajustes e melhorias.",
  },
];

async function main() {
  const adminEmail = "monteiroassessoriaadm@gmail.com";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Administrador Monteiro",
      email: adminEmail,
      passwordHash: await bcrypt.hash("Monteiro@123", 10),
      role: "ADMIN",
      active: true,
    },
  });
  console.log(`Usuário administrador pronto: ${admin.email}`);

  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      name: "Monteiro Assessoria Administrativa",
      slogan: "A Monteiro Resolve.",
    },
  });

  for (const service of DEFAULT_SERVICES) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    });
    if (!existing) {
      await prisma.service.create({ data: service });
    }
  }
  console.log("Catálogo de serviços inicial criado (preços a definir pelo administrador).");

  // Modelos de contrato e documentos do Jurídico entram pela migração
  // 20261110120000_juridico_contratos (texto em prisma/contract-templates/).
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
