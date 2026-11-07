"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { findOAuthClient, createAuthorizationCode } from "@/lib/oauth";

export async function authorizeDecisionAction(formData: FormData) {
  const session = await requireSession();

  const decision = formData.get("decision");
  const clientId = String(formData.get("client_id") || "");
  const redirectUri = String(formData.get("redirect_uri") || "");
  const codeChallenge = String(formData.get("code_challenge") || "");
  const codeChallengeMethod = String(formData.get("code_challenge_method") || "");
  const state = String(formData.get("state") || "");

  const client = await findOAuthClient(clientId);
  if (!client || !client.redirectUris.includes(redirectUri)) {
    // client_id/redirect_uri inválidos: não é seguro redirecionar para lugar nenhum.
    throw new Error("Pedido de autorização inválido.");
  }

  const callbackUrl = new URL(redirectUri);
  if (state) callbackUrl.searchParams.set("state", state);

  if (decision !== "allow" || session.role !== Role.ADMIN) {
    callbackUrl.searchParams.set("error", "access_denied");
    redirect(callbackUrl.toString());
  }

  if (codeChallengeMethod !== "S256") {
    callbackUrl.searchParams.set("error", "invalid_request");
    callbackUrl.searchParams.set(
      "error_description",
      "code_challenge_method deve ser S256.",
    );
    redirect(callbackUrl.toString());
  }

  const code = await createAuthorizationCode({
    clientId: client.id,
    userId: session.userId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
  });

  callbackUrl.searchParams.set("code", code);
  redirect(callbackUrl.toString());
}
