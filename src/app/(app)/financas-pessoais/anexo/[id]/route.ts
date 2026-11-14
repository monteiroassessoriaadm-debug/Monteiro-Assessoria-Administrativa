import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isPfOwner } from "@/lib/pf/access";

// Abre o comprovante de um lançamento pessoal. Só o dono.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!(await isPfOwner(session?.userId))) return new NextResponse("Não encontrado.", { status: 404 });
  const { id } = await params;
  const file = await prisma.pfAttachment.findUnique({ where: { id } });
  if (!file) return new NextResponse("Não encontrado.", { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
