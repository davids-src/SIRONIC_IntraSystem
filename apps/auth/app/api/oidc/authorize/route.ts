import { NextResponse } from "next/server";
import {
  connectAuthDb,
  findActiveOidcClient,
  createAuthorizationCode,
} from "@crm/auth-core/server";
import { getSession } from "@/lib/session-cookie";
import { issuer } from "@/lib/issuer";

function errorPage(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  await connectAuthDb();
  const url = new URL(req.url);
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const responseType = url.searchParams.get("response_type");
  const scope = url.searchParams.get("scope") ?? "openid";
  const state = url.searchParams.get("state");
  const codeChallenge = url.searchParams.get("code_challenge");
  const codeChallengeMethod = url.searchParams.get("code_challenge_method");

  // Everything up to and including the redirect_uri match must be validated BEFORE we ever
  // redirect anywhere — redirecting on an unregistered/unverified redirect_uri is exactly
  // the open-redirect hole OAuth's "exact match" rule exists to close.
  if (!clientId || !redirectUri) {
    return errorPage("Hiányzó client_id vagy redirect_uri.");
  }
  const client = await findActiveOidcClient(clientId);
  if (!client) {
    return errorPage("Ismeretlen client_id.");
  }
  if (!client.redirect_uris.includes(redirectUri)) {
    return errorPage("A redirect_uri nem egyezik a regisztrált értékkel.");
  }

  // From here on, redirect_uri is a trusted destination for this client — errors can go
  // back to it as `?error=...` per spec.
  const failWithRedirect = (error: string) => {
    const target = new URL(redirectUri);
    target.searchParams.set("error", error);
    if (state) target.searchParams.set("state", state);
    return NextResponse.redirect(target.toString());
  };

  if (responseType !== "code") {
    return failWithRedirect("unsupported_response_type");
  }
  // PKCE mandatory for every client, confidential or not (docs/auth-platform/03 §7).
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return failWithRedirect("invalid_request");
  }

  const session = await getSession();
  if (!session) {
    // url.origin is NOT reliable here — this app runs behind a reverse proxy, and depending
    // on what Host it forwards, `new URL(req.url).origin` can resolve to the container's
    // own internal bind address instead of the public issuer address. issuer() is the same
    // AUTH_URL-backed value already used for discovery/token/userinfo, so this redirect
    // lands on the real public login page every time, not just when the proxy forwards Host
    // faithfully.
    const returnTo = new URL("/login", issuer());
    returnTo.searchParams.set("return_to", url.pathname + url.search);
    return NextResponse.redirect(returnTo.toString());
  }

  const code = await createAuthorizationCode({
    clientId: client.client_id,
    userId: session.sub,
    redirectUri,
    scope,
    codeChallenge,
  });

  const target = new URL(redirectUri);
  target.searchParams.set("code", code);
  if (state) target.searchParams.set("state", state);
  return NextResponse.redirect(target.toString());
}
