import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { displayClientDocument, displayClientName } from "@/lib/client-display";
import { getCompany, previewTemplateText } from "@/lib/contracts";
import { ContractPdf } from "./contract-pdf";

function companyProps(company: Awaited<ReturnType<typeof getCompany>>) {
  return {
    name: company.name,
    slogan: company.slogan,
    logoData: company.logoData,
    representativeName: company.representativeName,
    cnpj: company.cnpj,
  };
}

/** PDF da versão atual (ou de uma versão anterior) do contrato. */
export async function renderContractPdf(contractId: string, version?: number) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId }, include: { client: true } });
  if (!contract) return null;
  const old = version && version !== contract.currentVersion
    ? await prisma.contractVersion.findUnique({ where: { contractId_version: { contractId, version } } })
    : null;
  if (version && version !== contract.currentVersion && !old) return null;

  const company = await getCompany();
  const buffer = await renderToBuffer(
    ContractPdf({
      company: companyProps(company),
      contract: {
        code: contract.code,
        kind: contract.kind,
        status: old ? "RASCUNHO" : contract.status,
        version: old?.version ?? contract.currentVersion,
        renderedContent: old?.renderedContent ?? contract.renderedContent,
        clientName: displayClientName(contract.client),
        clientDocument: `${contract.client.type === "PF" ? "CPF" : "CNPJ"} ${displayClientDocument(contract.client)}`,
      },
    }),
  );
  const suffix = old ? `-v${old.version}` : "";
  return { buffer, filename: `${contract.code}${suffix}.pdf` };
}

/** Prévia do modelo, com os dados da Monteiro e os campos de exemplo. */
export async function renderTemplatePdf(templateId: string, clientType: "PF" | "PJ" = "PF") {
  const { template, text } = await previewTemplateText(templateId, clientType);
  const company = await getCompany();
  const buffer = await renderToBuffer(
    ContractPdf({
      company: companyProps(company),
      contract: {
        code: null,
        kind: template.kind,
        status: "RASCUNHO",
        version: template.version,
        renderedContent: text,
        clientName: null,
        clientDocument: null,
      },
    }),
  );
  const slug = template.slug ?? template.id;
  return { buffer, filename: `modelo-${slug}-v${template.version}.pdf` };
}
