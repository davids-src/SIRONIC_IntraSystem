import { randomBytes, createHash } from "node:crypto";
import { OidcAuthorizationCodeModel } from "./models/oidc-authorization-code";

const CODE_TTL_MS = 60_000;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function createAuthorizationCode(params: {
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
}): Promise<string> {
  const code = randomBytes(32).toString("base64url");
  await OidcAuthorizationCodeModel.create({
    code_hash: hashCode(code),
    client_id: params.clientId,
    user_id: params.userId,
    redirect_uri: params.redirectUri,
    scope: params.scope,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
    expires_at: new Date(Date.now() + CODE_TTL_MS),
  });
  return code;
}

export type ConsumedAuthorizationCode = {
  client_id: string;
  user_id: string;
  redirect_uri: string;
  scope: string;
  code_challenge: string;
};

/** Atomic single-use: findOneAndDelete means two requests racing on the same code can only
 * ever have one of them get the doc back — no separate "mark consumed" step to race on. */
export async function consumeAuthorizationCode(
  code: string,
): Promise<ConsumedAuthorizationCode | null> {
  const doc = await OidcAuthorizationCodeModel.findOneAndDelete({
    code_hash: hashCode(code),
    expires_at: { $gt: new Date() },
  }).lean<ConsumedAuthorizationCode | null>();
  return doc;
}
