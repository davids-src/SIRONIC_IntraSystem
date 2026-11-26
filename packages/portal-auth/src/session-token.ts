/**
 * Portal session token: a compact HS256 JWT signed with `PORTAL_AUTH_SECRET` via Web Crypto
 * (works in Node and in the edge middleware). Deliberately NOT an Auth.js token: the staff app
 * cannot decode it (different cookie name, different format, different secret) and this module
 * refuses anything that is not an HS256 JWT with the portal issuer and audience.
 */
import {
  PORTAL_JWT_AUDIENCE,
  PORTAL_JWT_ISSUER,
  PORTAL_SECRET_MIN_LENGTH,
  PORTAL_SESSION_MAX_AGE_SEC,
} from "./constants";

export type PortalSessionClaims = {
  portalUserId: string;
  partnerId: string;
  rolak: string[];
};

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array | null {
  try {
    const pad = str.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  if (secret.length < PORTAL_SECRET_MIN_LENGTH)
    throw new Error(
      `PORTAL_AUTH_SECRET legalább ${PORTAL_SECRET_MIN_LENGTH} karakter legyen`,
    );
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

export function getPortalSecret(): string {
  const s = process.env.PORTAL_AUTH_SECRET;
  if (!s) throw new Error("PORTAL_AUTH_SECRET nincs beállítva");
  return s;
}

export async function signPortalSession(
  claims: PortalSessionClaims,
  secret: string,
  maxAgeSec = PORTAL_SESSION_MAX_AGE_SEC,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<string> {
  const header = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = b64url(
    enc.encode(
      JSON.stringify({
        iss: PORTAL_JWT_ISSUER,
        aud: PORTAL_JWT_AUDIENCE,
        iat: nowSec,
        exp: nowSec + maxAgeSec,
        sub: claims.portalUserId,
        partnerId: claims.partnerId,
        rolak: claims.rolak,
      }),
    ),
  );
  const key = await hmacKey(secret, "sign");
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${payload}`));
  return `${header}.${payload}.${b64url(new Uint8Array(sig))}`;
}

/** `null` for anything that is not a valid, unexpired portal token signed with `secret`. */
export async function verifyPortalSession(
  token: string | undefined | null,
  secret: string | undefined,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<PortalSessionClaims | null> {
  if (!token || !secret || secret.length < PORTAL_SECRET_MIN_LENGTH) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts as [string, string, string];
  try {
    const headerBytes = b64urlDecode(h);
    const sig = b64urlDecode(s);
    const payloadBytes = b64urlDecode(p);
    if (!headerBytes || !sig || !payloadBytes) return null;
    const header = JSON.parse(new TextDecoder().decode(headerBytes)) as { alg?: string };
    if (header.alg !== "HS256") return null;
    const key = await hmacKey(secret, "verify");
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      sig as BufferSource,
      enc.encode(`${h}.${p}`),
    );
    if (!ok) return null;
    const c = JSON.parse(new TextDecoder().decode(payloadBytes)) as Record<
      string,
      unknown
    >;
    if (c.iss !== PORTAL_JWT_ISSUER || c.aud !== PORTAL_JWT_AUDIENCE) return null;
    if (typeof c.exp !== "number" || c.exp <= nowSec) return null;
    if (typeof c.sub !== "string" || !c.sub) return null;
    if (typeof c.partnerId !== "string" || !c.partnerId) return null;
    if (!Array.isArray(c.rolak) || !c.rolak.every((r) => typeof r === "string"))
      return null;
    return { portalUserId: c.sub, partnerId: c.partnerId, rolak: c.rolak as string[] };
  } catch {
    return null;
  }
}
