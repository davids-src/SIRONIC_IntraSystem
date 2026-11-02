import mongoose from "mongoose";
import {
  generateKeyPair,
  exportJWK,
  importJWK,
  calculateJwkThumbprint,
  SignJWT,
  jwtVerify,
  type JWK,
  type CryptoKey,
} from "jose";

const ALG = "EdDSA";
const SIGNING_KEY_LOCK_ID = "singleton";

type LoadedKeys = {
  privateKey: CryptoKey | Uint8Array;
  publicKey: CryptoKey | Uint8Array;
  publicJwk: JWK;
  kid: string;
};

// Deliberately NOT a module-level cache: this app's API routes each get their own bundled
// module instance (Next.js transpiles @crm/auth-core per-route rather than loading it once
// via Node's module cache, unlike externalized packages such as mongoose) — a plain JS
// variable here would silently hold a *different* key per route, which is exactly what
// happened before this was DB-backed: /token signed with one ephemeral key and /userinfo
// verified against another, so every token failed verification. The private key material
// itself is still only fetched/generated once, in `resolvePrivateJwk`, which is cheap to
// call repeatedly — it's a single findOne (or one insert, only for whichever request
// happens to be first ever).
async function resolvePrivateJwk(): Promise<JWK> {
  const envJwk = process.env.AUTH_OIDC_PRIVATE_KEY;
  if (envJwk) return JSON.parse(envJwk) as JWK;

  const collection = mongoose.connection.collection("oidc_signing_keys");
  const existing = await collection.findOne({ _id: SIGNING_KEY_LOCK_ID as any });
  if (existing) return existing.jwk as JWK;

  const { privateKey } = await generateKeyPair(ALG, {
    crv: "Ed25519",
    extractable: true,
  });
  const jwk = await exportJWK(privateKey);
  try {
    await collection.insertOne({
      _id: SIGNING_KEY_LOCK_ID as any,
      jwk,
      created_at: new Date(),
    });
    return jwk;
  } catch (e) {
    // Another process/request won the race to create the first key — use theirs, not ours.
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code?: number }).code === 11000
    ) {
      const winner = await collection.findOne({ _id: SIGNING_KEY_LOCK_ID as any });
      if (winner) return winner.jwk as JWK;
    }
    throw e;
  }
}

async function loadKeys(): Promise<LoadedKeys> {
  const jwk = await resolvePrivateJwk();
  const privateKey = await importJWK(jwk, ALG);
  const publicJwkBase = { ...jwk };
  delete (publicJwkBase as { d?: string }).d;
  const publicKey = await importJWK(publicJwkBase, ALG);

  const kid = await calculateJwkThumbprint(publicJwkBase);
  return {
    privateKey,
    publicKey,
    publicJwk: { ...publicJwkBase, kid, use: "sig", alg: ALG },
    kid,
  };
}

export async function signIdToken(claims: {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string | null;
  issuer: string;
  audience: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { privateKey, kid } = await loadKeys();
  return new SignJWT({
    email: claims.email,
    email_verified: claims.email_verified,
    name: claims.name ?? undefined,
  })
    .setProtectedHeader({ alg: ALG, kid })
    .setSubject(claims.sub)
    .setIssuer(claims.issuer)
    .setAudience(claims.audience)
    .setIssuedAt()
    .setExpirationTime(`${claims.expiresInSeconds ?? 3600}s`)
    .sign(privateKey);
}

export type VerifiedIdToken = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
};

/** Verifies a token this same server issued — used by /userinfo, which accepts the id_token
 * as a bearer access token (this MVP doesn't mint a separate opaque access token). */
export async function verifyIssuedToken(
  token: string,
  opts: { issuer: string; audience?: string },
): Promise<VerifiedIdToken | null> {
  try {
    const { publicKey } = await loadKeys();
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: opts.issuer,
      audience: opts.audience,
    });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified === true,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  } catch {
    return null;
  }
}

export async function getJwks(): Promise<{ keys: JWK[] }> {
  const { publicJwk } = await loadKeys();
  return { keys: [publicJwk] };
}

/** One-off CLI helper (see docs) — generates a key pair for AUTH_OIDC_PRIVATE_KEY, for
 * deployments that want ops-controlled key rotation instead of the DB-backed auto-key. */
export async function generateOidcSigningKeyJwk(): Promise<string> {
  const { privateKey } = await generateKeyPair(ALG, {
    crv: "Ed25519",
    extractable: true,
  });
  const jwk = await exportJWK(privateKey);
  return JSON.stringify(jwk);
}
