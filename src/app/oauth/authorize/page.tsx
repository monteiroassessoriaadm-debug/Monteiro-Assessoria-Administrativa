import { requireSession } from "@/lib/permissions";
import { Role } from "@/generated/prisma/enums";
import { findOAuthClient } from "@/lib/oauth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authorizeDecisionAction } from "./actions";

type SearchParams = {
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  state?: string;
  scope?: string;
};

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function OAuthAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  const {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    state,
  } = params;

  if (!clientId || !redirectUri || !codeChallenge) {
    return (
      <ErrorScreen
        title="Pedido de autorização inválido"
        message="Faltam parâmetros obrigatórios (client_id, redirect_uri ou code_challenge)."
      />
    );
  }

  if (responseType !== "code") {
    return (
      <ErrorScreen
        title="Pedido de autorização inválido"
        message={`response_type "${responseType}" não é suportado — use "code".`}
      />
    );
  }

  const client = await findOAuthClient(clientId);
  if (!client) {
    return (
      <ErrorScreen
        title="Conector desconhecido"
        message="Este conector ainda não foi registrado neste servidor."
      />
    );
  }

  if (!client.redirectUris.includes(redirectUri)) {
    return (
      <ErrorScreen
        title="Endereço de retorno não reconhecido"
        message="O redirect_uri informado não está cadastrado para este conector."
      />
    );
  }

  if (session.role !== Role.ADMIN) {
    return (
      <ErrorScreen
        title="Só o administrador pode autorizar"
        message={`Você está logado como ${session.name} (${session.role}). Peça para o administrador entrar e aprovar este conector.`}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Permitir acesso do Claude ao Monteiro CRM?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            {client.clientName || "Um conector"} está pedindo para ler e registrar
            informações no CRM em seu nome ({session.name}, {session.email}).
          </p>
          <p className="text-xs text-slate-400">
            Toda ação feita por esse conector fica registrada no sistema como
            &quot;via Claude&quot;.
          </p>
          <div className="flex gap-3">
            <form action={authorizeDecisionAction} className="flex-1">
              <input type="hidden" name="decision" value="deny" />
              <input type="hidden" name="client_id" value={clientId} />
              <input type="hidden" name="redirect_uri" value={redirectUri} />
              <input type="hidden" name="code_challenge" value={codeChallenge} />
              <input
                type="hidden"
                name="code_challenge_method"
                value={codeChallengeMethod ?? ""}
              />
              <input type="hidden" name="state" value={state ?? ""} />
              <Button type="submit" variant="outline" className="w-full">
                Negar
              </Button>
            </form>
            <form action={authorizeDecisionAction} className="flex-1">
              <input type="hidden" name="decision" value="allow" />
              <input type="hidden" name="client_id" value={clientId} />
              <input type="hidden" name="redirect_uri" value={redirectUri} />
              <input type="hidden" name="code_challenge" value={codeChallenge} />
              <input
                type="hidden"
                name="code_challenge_method"
                value={codeChallengeMethod ?? ""}
              />
              <input type="hidden" name="state" value={state ?? ""} />
              <Button type="submit" className="w-full">
                Permitir
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
