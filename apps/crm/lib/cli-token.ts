import { SignJWT, jwtVerify } from "jose";
import type { RoleKey } from "@crm/types";

/**
 * Bearer tokens for `sironic-deploy` (the deployments CLI). Distinct from the browser's
 * NextAuth session cookie — the CLI never holds that cookie, so `requireCrmAuth()` accepts
 * either. Minted only after a caller has already proven their identity against apps/auth's
 * OIDC provider (see app/api/auth/cli/exchange/route.ts); this token is the CRM-local
 * authorization that follows from that proof, scoped to the same CrmUser/roleKeys the
 * browser session would carry.
 */
const ALG = "HS256";

export interface CliTokenClaims {
  sub: string;
  tenantId: string;
  roleKeys: RoleKey[];
  email: string;
}

function secret(): Uint8Array {
  const raw = process.env.CRM_CLI_TOKEN_SECRET;
  if (!raw) {
    throw new Error("CRM_CLI_TOKEN_SECRET is not set");
  }
  return new TextEncoder().encode(raw);
}

export const CLI_TOKEN_TTL_SECONDS = 60 * 60 * 12;

export async function signCliToken(claims: CliTokenClaims): Promise<string> {
  return new SignJWT({
    tenantId: claims.tenantId,
    roleKeys: claims.roleKeys,
    email: claims.email,
  })
    .setProtectedHeader({ alg: ALG })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${CLI_TOKEN_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyCliToken(token: string): Promise<CliTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.tenantId !== "string" ||
      typeof payload.email !== "string" ||
      !Array.isArray(payload.roleKeys)
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      tenantId: payload.tenantId,
      roleKeys: payload.roleKeys as RoleKey[],
      email: payload.email,
    };
  } catch {
    return null;
  }
}
