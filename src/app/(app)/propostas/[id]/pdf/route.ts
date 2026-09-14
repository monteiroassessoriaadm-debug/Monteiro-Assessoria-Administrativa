import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { ProposalPdf } from "@/lib/pdf/proposal-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireSession();
  const { id } = await params;

  const [proposal, company] = await Promise.all([
    prisma.proposal.findUnique({
      where: { id },
      include: { client: true, service: true },
    }),
    prisma.companySettings.findFirst(),
  ]);

  if (!proposal) {
    return NextResponse.json({ error: "Proposta não encontrada." }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    ProposalPdf({
      company: {
        name: company?.name ?? "Monteiro Assessoria Administrativa",
        slogan: company?.slogan ?? null,
        logoData: company?.logoData ?? null,
      },
      proposal: {
        number: proposal.number,
        createdAt: proposal.createdAt,
        validUntil: proposal.validUntil,
        demand: proposal.demand,
        solution: proposal.solution,
        scope: proposal.scope,
        termText: proposal.termText,
        investment: proposal.investment?.toString() ?? null,
        paymentTerms: proposal.paymentTerms,
        notes: proposal.notes,
        serviceName: proposal.service?.name ?? null,
        client: proposal.client,
      },
    }),
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="proposta-${proposal.number}.pdf"`,
    },
  });
}
