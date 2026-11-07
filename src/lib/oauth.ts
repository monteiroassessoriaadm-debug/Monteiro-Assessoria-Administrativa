import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const AUTH_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora — o refresh token não expira sozinho, só por revogação

function base64url(input: Buffer) {
  return input.toString("base64url");
}

export function randomToken(bytes = 32) {
  return base64url(randomBytes(bytes));
}

export function sha256Base64Url(input: string) {
  return base64url(createHash("sha256").update(input).digest());
}

function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

/** Verifica o code_verifier do PKCE contra o code_challenge salvo (só aceita S256). */
export function verifyPkce(codeVerifier: string, codeChallenge: string, method: string) {
  if (method !== "S256") return false;
  return sha256Base64Url(codeVerifier) === codeChallenge;
}

// ---------- Dynamic Client Registration (RFC 7591) ----------

export async function registerOAuthClient(params: {
  redirectUris: string[];
  clientName?: string;
}) {
  const clientId = `mcp_${randomToken(16)}`;
  const client = await prisma.oAuthClient.create({
    data: {
      clientId,
      redirectUris: params.redirectUris,
      clientName: params.clientName || null,
    },
  });
  return client;
}

export async function findOAuthClient(clientId: string) {
  return prisma.oAuthClient.findUnique({ where: { clientId } });
}

// ---------- Authorization code ----------

export async function createAuthorizationCode(params: {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}) {
  const code = randomToken(32);
  await prisma.oAuthAuthorizationCode.create({
    data: {
      codeHash: sha256Hex(code),
      clientId: params.clientId,
      userId: params.userId,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
    },
  });
  return code;
}

/** Consome (uso único) o authorization code. Retorna null se inválido/expirado/já usado. */
export async function consumeAuthorizationCode(code: string) {
  const codeHash = sha256Hex(code);
  const record = await prisma.oAuthAuthorizationCode.findUnique({ where: { codeHash } });
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  await prisma.oAuthAuthorizationCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record;
}

// ---------- Access / refresh tokens ----------

export type IssuedTokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function issueTokenPair(params: {
  clientId: string;
  userId: string;
}): Promise<IssuedTokenPair> {
  const accessToken = randomToken(32);
  const refreshToken = randomToken(32);
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);

  await prisma.oAuthToken.create({
    data: {
      clientId: params.clientId,
      userId: params.userId,
      accessTokenHash: sha256Hex(accessToken),
      refreshTokenHash: sha256Hex(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_MS / 1000 };
}

export async function findValidAccessToken(accessToken: string) {
  const accessTokenHash = sha256Hex(accessToken);
  const token = await prisma.oAuthToken.findUnique({
    where: { accessTokenHash },
    include: { user: true, client: true },
  });
  if (!token) return null;
  if (token.revokedAt) return null;
  if (token.expiresAt < new Date()) return null;
  if (!token.user.active) return null;
  return token;
}

/** Troca um refresh token válido por um novo par (rotação: revoga o antigo). */
export async function rotateRefreshToken(refreshToken: string): Promise<IssuedTokenPair | null> {
  const refreshTokenHash = sha256Hex(refreshToken);
  const token = await prisma.oAuthToken.findUnique({ where: { refreshTokenHash } });
  if (!token || token.revokedAt) return null;

  await prisma.oAuthToken.update({
    where: { id: token.id },
    data: { revokedAt: new Date() },
  });

  return issueTokenPair({ clientId: token.clientId, userId: token.userId });
}
