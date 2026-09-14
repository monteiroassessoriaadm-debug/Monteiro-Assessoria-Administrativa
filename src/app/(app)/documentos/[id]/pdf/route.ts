import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { GeneratedDocumentPdf } from "@/lib/pdf/document-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireSession();
  const { id } = await params;

  const [doc, company] = await Promise.all([
    prisma.generatedDocument.findUnique({ where: { id }, include: { template: true } }),
    prisma.companySettings.findFirst(),
  ]);

  if (!doc) {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    GeneratedDocumentPdf({
      company: {
        name: company?.name ?? "Monteiro Assessoria Administrativa",
        slogan: company?.slogan ?? null,
        logoData: company?.logoData ?? null,
      },
      document: {
        number: doc.number,
        title: doc.title,
        createdAt: doc.createdAt,
        headerNote: doc.template.headerNote,
        footerNote: doc.template.footerNote,
        renderedContent: doc.renderedContent,
      },
    }),
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="documento-${doc.number}.pdf"`,
    },
  });
}
