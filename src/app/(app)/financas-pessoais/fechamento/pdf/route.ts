import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/session";
import { isPfOwner } from "@/lib/pf/access";
import { getClosing } from "@/lib/pf/fechamento";
import { PfFechamentoPdf } from "@/lib/pdf/pf-fechamento-pdf";

export async function GET(request: Request) {
  const session = await getSession();
  if (!(await isPfOwner(session?.userId))) return new NextResponse("Não encontrado.", { status: 404 });

  const mes = new URL(request.url).searchParams.get("mes");
  const month = mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : undefined;
  const c = await getClosing(month);
  const buffer = await renderToBuffer(
    PfFechamentoPdf({
      monthTitle: c.monthTitle,
      generatedAt: new Date(),
      boxes: c.boxes,
      indicators: c.indicators,
      comparison: c.comparison,
      categories: c.categories,
    }),
  );
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="fechamento-pessoal-${c.summary.month}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
