import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/permissions";
import { QuotePdf } from "@/lib/pdf/quote-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireSession();
  const { id } = await params;

  const [quote, company] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: { client: true, items: true },
    }),
    prisma.companySettings.findFirst(),
  ]);

  if (!quote) {
    return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    QuotePdf({
      company: {
        name: company?.name ?? "Monteiro Assessoria Administrativa",
        slogan: company?.slogan ?? null,
        logoData: company?.logoData ?? null,
      },
      quote: {
        number: quote.number,
        createdAt: quote.createdAt,
        validUntil: quote.validUntil,
        paymentTerms: quote.paymentTerms,
        notes: quote.notes,
        items: quote.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          termDays: item.termDays,
        })),
        client: quote.client,
      },
    }),
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="orcamento-${quote.number}.pdf"`,
    },
  });
}
