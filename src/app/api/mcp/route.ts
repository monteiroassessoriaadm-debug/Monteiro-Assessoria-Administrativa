import { NextRequest, NextResponse } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { findValidAccessToken } from "@/lib/oauth";
import { registerCrmTools } from "@/lib/mcp/tools";
import { registerExtraCrmTools } from "@/lib/mcp/tools-extra";
import { registerFase1CrmTools } from "@/lib/mcp/tools-fase1";
import { registerJuridicoTools } from "@/lib/mcp/tools-juridico";

export const runtime = "nodejs";

function unauthorized(origin: string) {
  return new NextResponse(
    JSON.stringify({ error: "unauthorized", error_description: "Token de acesso ausente ou inválido." }),
    {
      status: 401,
      headers: {
        "content-type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
      },
    },
  );
}

async function handle(request: NextRequest): Promise<Response> {
  const origin = request.nextUrl.origin;
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return unauthorized(origin);

  const tokenRecord = await findValidAccessToken(match[1]);
  if (!tokenRecord) return unauthorized(origin);

  const server = new McpServer({ name: "monteiro-crm", version: "1.0.0" });
  registerCrmTools(server, { userId: tokenRecord.userId });
  registerExtraCrmTools(server, { userId: tokenRecord.userId });
  registerFase1CrmTools(server, { userId: tokenRecord.userId });
  registerJuridicoTools(server, { userId: tokenRecord.userId, origin });

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);

  return transport.handleRequest(request, {
    authInfo: {
      token: match[1],
      clientId: tokenRecord.clientId,
      scopes: ["crm"],
      expiresAt: Math.floor(tokenRecord.expiresAt.getTime() / 1000),
      extra: { userId: tokenRecord.userId },
    },
  });
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function DELETE(request: NextRequest) {
  return handle(request);
}
