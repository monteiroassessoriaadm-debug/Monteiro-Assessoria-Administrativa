import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { renderContractPdf } from "@/lib/pdf/render-contract";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const versao = Number(new URL(request.url).searchParams.get("versao")) || undefined;

  const pdf = await renderContractPdf(id, versao);
  if (!pdf) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });

  return new NextResponse(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
    },
  });
}
