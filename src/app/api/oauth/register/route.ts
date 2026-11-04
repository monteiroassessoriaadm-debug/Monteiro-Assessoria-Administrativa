import { NextRequest, NextResponse } from "next/server";
import { registerOAuthClient } from "@/lib/oauth";

export const runtime = "nodejs";

function isValidRedirectUri(uri: unknown): uri is string {
  if (typeof uri !== "string") return false;
  try {
    const parsed = new URL(uri);
    return parsed.protocol === "https:" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "Corpo JSON inválido." },
      { status: 400 },
    );
  }

  const redirectUris = (body as { redirect_uris?: unknown })?.redirect_uris;
  const clientName = (body as { client_name?: unknown })?.client_name;

  if (!Array.isArray(redirectUris) || redirectUris.length === 0 || !redirectUris.every(isValidRedirectUri)) {
    return NextResponse.json(
      {
        error: "invalid_redirect_uri",
        error_description: "redirect_uris deve ser uma lista com ao menos uma URL https válida.",
      },
      { status: 400 },
    );
  }

  const client = await registerOAuthClient({
    redirectUris,
    clientName: typeof clientName === "string" ? clientName : undefined,
  });

  return NextResponse.json(
    {
      client_id: client.clientId,
      client_name: client.clientName ?? undefined,
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    { status: 201 },
  );
}
