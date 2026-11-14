import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isPfOwner } from "@/lib/pf/access";
import { OperationError } from "@/lib/crm-operations";
import { saveAttachment } from "@/lib/pf/service";

// Envio do comprovante de um lançamento pessoal. Só o dono.
export async function POST(request: Request) {
  const session = await getSession();
  if (!(await isPfOwner(session?.userId))) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  const transactionId = String(form.get("transactionId") ?? "");
  if (!(file instanceof File)) return NextResponse.json({ error: "Escolha um arquivo." }, { status: 400 });
  try {
    await saveAttachment(transactionId, { name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) });
  } catch (e) {
    if (e instanceof OperationError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
  return NextResponse.json({ ok: true });
}
