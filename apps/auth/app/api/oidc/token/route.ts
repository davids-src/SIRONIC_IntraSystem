import { NextResponse } from "next/server";
import {
  connectAuthDb,
  PlatformUserModel,
  consumeAuthorizationCode,
  findActiveOidcClient,
  verifyPassword,
  verifyPkce,
  signIdToken,
} from "@crm/auth-core/server";
import { issuer } from "@/lib/issuer";

function oauthError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** Confidential clients may send the secret via HTTP Basic (RFC 6749 §2.3.1) or in the body. */
function parseBasicAuth(req: Request): { clientId: string; clientSecret: string } | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    if (sep < 0) return null;
    return { clientId: decoded.slice(0, sep), clientSecret: decoded.slice(sep + 1) };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  await connectAuthDb();

  const contentType = req.headers.get("content-type") ?? "";
  const params = contentType.includes("application/json")
    ? new URLSearchParams(Object.entries((await req.json()) as Record<string, string>))
    : new URLSearchParams(await req.text());

  const grantType = params.get("grant_type");
  const code = params.get("code");
  const redirectUri = params.get("redirect_uri");
  const codeVerifier = params.get("code_verifier");
  const basicAuth = parseBasicAuth(req);
  const clientId = basicAuth?.clientId ?? params.get("client_id");
  const clientSecret = basicAuth?.clientSecret ?? params.get("client_secret");

  if (grantType !== "authorization_code") {
    return oauthError("unsupported_grant_type");
  }
  if (!code || !redirectUri || !clientId || !codeVerifier) {
    return oauthError("invalid_request");
  }

  // Atomic consume first — a code is single-use regardless of what happens next.
  const consumed = await consumeAuthorizationCode(code);
  if (!consumed) {
    return oauthError("invalid_grant");
  }
  if (consumed.client_id !== clientId || consumed.redirect_uri !== redirectUri) {
    return oauthError("invalid_grant");
  }

  const client = await findActiveOidcClient(clientId);
  if (!client) {
    return oauthError("invalid_client", 401);
  }
  if (client.token_endpoint_auth_method === "client_secret_basic") {
    if (!clientSecret || !client.client_secret_hash) {
      return oauthError("invalid_client", 401);
    }
    const secretOk = await verifyPassword(clientSecret, client.client_secret_hash);
    if (!secretOk) {
      return oauthError("invalid_client", 401);
    }
  }

  if (!verifyPkce(codeVerifier, consumed.code_challenge)) {
    return oauthError("invalid_grant");
  }

  const user = await PlatformUserModel.findById(consumed.user_id).lean<{
    _id: unknown;
    email: string;
    display_name: string | null;
    email_verified_at: Date | null;
  } | null>();
  if (!user) {
    return oauthError("invalid_grant");
  }

  const idToken = await signIdToken({
    sub: String(user._id),
    email: user.email,
    email_verified: !!user.email_verified_at,
    name: user.display_name,
    issuer: issuer(),
    audience: clientId,
  });

  return NextResponse.json({
    access_token: idToken,
    id_token: idToken,
    token_type: "Bearer",
    expires_in: 3600,
    scope: consumed.scope,
  });
}
