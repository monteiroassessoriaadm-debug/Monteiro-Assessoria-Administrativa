import { NextRequest, NextResponse } from "next/server";
import {
  consumeAuthorizationCode,
  findOAuthClient,
  issueTokenPair,
  rotateRefreshToken,
  verifyPkce,
} from "@/lib/oauth";

export const runtime = "nodejs";

function oauthError(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status });
}

async function readParams(request: NextRequest): Promise<URLSearchParams> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<string, string>;
    return new URLSearchParams(body);
  }
  const text = await request.text();
  return new URLSearchParams(text);
}

export async function POST(request: NextRequest) {
  const params = await readParams(request);
  const grantType = params.get("grant_type");

  if (grantType === "authorization_code") {
    const code = params.get("code");
    const redirectUri = params.get("redirect_uri");
    const clientId = params.get("client_id");
    const codeVerifier = params.get("code_verifier");

    if (!code || !redirectUri || !clientId || !codeVerifier) {
      return oauthError("invalid_request", "Parâmetros obrigatórios ausentes.");
    }

    const client = await findOAuthClient(clientId);
    if (!client) return oauthError("invalid_client", "Cliente desconhecido.");

    const authCode = await consumeAuthorizationCode(code);
    if (!authCode || authCode.clientId !== client.id || authCode.redirectUri !== redirectUri) {
      return oauthError("invalid_grant", "Código de autorização inválido, expirado ou já usado.");
    }

    if (!verifyPkce(codeVerifier, authCode.codeChallenge, authCode.codeChallengeMethod)) {
      return oauthError("invalid_grant", "code_verifier não confere com o code_challenge.");
    }

    const tokens = await issueTokenPair({ clientId: client.id, userId: authCode.userId });
    return NextResponse.json({
      access_token: tokens.accessToken,
      token_type: "Bearer",
      expires_in: tokens.expiresIn,
      refresh_token: tokens.refreshToken,
      scope: "crm",
    });
  }

  if (grantType === "refresh_token") {
    const refreshToken = params.get("refresh_token");
    if (!refreshToken) {
      return oauthError("invalid_request", "refresh_token é obrigatório.");
    }

    const tokens = await rotateRefreshToken(refreshToken);
    if (!tokens) {
      return oauthError("invalid_grant", "Refresh token inválido ou revogado.");
    }

    return NextResponse.json({
      access_token: tokens.accessToken,
      token_type: "Bearer",
      expires_in: tokens.expiresIn,
      refresh_token: tokens.refreshToken,
      scope: "crm",
    });
  }

  return oauthError("unsupported_grant_type", `grant_type "${grantType}" não é suportado.`);
}
