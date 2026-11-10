import { NextResponse } from "next/server";
import { requireSession } from "@/lib/permissions";
import { OperationError } from "@/lib/contracts";
import { renderTemplatePdf } from "@/lib/pdf/render-contract";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const tipo = new URL(request.url).searchParams.get("tipo") === "PJ" ? "PJ" : "PF";
  try {
    const pdf = await renderTemplatePdf(id, tipo);
    return new NextResponse(new Uint8Array(pdf.buffer), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${pdf.filename}"` },
    });
  } catch (e) {
    if (e instanceof OperationError) return NextResponse.json({ error: e.message }, { status: 404 });
    throw e;
  }
}
