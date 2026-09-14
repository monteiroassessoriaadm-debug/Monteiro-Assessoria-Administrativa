import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({
  url: databaseUrl.replace(/^file:/, ""),
});
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
