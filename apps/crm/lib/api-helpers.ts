import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type { Session } from "next-auth";
import { auth } from "../auth";
import { toActorContext, type AuthSession } from "@crm/auth";
import { ForbiddenError, OrchestratorError, authorizeOrThrow } from "@crm/modules";
import { IntegrationError } from "@crm/integrations";
import { connectDb } from "@crm/db";
import type { ActorContext, PermissionCheck, RoleKey } from "@crm/types";
import { verifyCliToken, CLI_TOKEN_TTL_SECONDS } from "./cli-token";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Accepts either the browser's NextAuth session cookie, or an `Authorization: Bearer`
 * CLI token minted by /api/auth/cli/exchange — the CLI has no cookie jar for this app, so
 * it authenticates every request with that token instead. Bearer is checked first since
 * it's cheap and unambiguous; absent, this falls through to the exact session check that
 * ran here before the CLI existed.
 */
export async function requireCrmAuth() {
  const authHeader = (await headers()).get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const claims = await verifyCliToken(authHeader.slice(7));
    if (!claims) {
      throw new HttpError(401, "Unauthorized");
    }
    const authSession: AuthSession = {
      userId: claims.sub,
      tenantId: claims.tenantId,
      roleKeys: claims.roleKeys,
    };
    // Shaped like a real NextAuth Session so existing callers that read `session.user.*`
    // (e.g. for audit fields) keep working whether the caller came in by cookie or CLI token.
    const cliSession: Session = {
      user: {
        id: claims.sub,
        tenantId: claims.tenantId,
        roleKeys: claims.roleKeys,
        email: claims.email,
      },
      expires: new Date(Date.now() + CLI_TOKEN_TTL_SECONDS * 1000).toISOString(),
    };
    return { session: cliSession, actor: toActorContext(authSession) };
  }

  const session = await auth();
  if (!session?.user?.id || !session.user.tenantId) {
    throw new HttpError(401, "Unauthorized");
  }
  const roleKeys = session.user.roleKeys as RoleKey[];
  const authSession: AuthSession = {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    roleKeys,
  };
  return { session, actor: toActorContext(authSession) };
}

export function guard(actor: ActorContext, check: PermissionCheck): void {
  authorizeOrThrow(actor, check);
}

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  if (e instanceof ForbiddenError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (e instanceof OrchestratorError) {
    const status =
      e.code === "DEPLOYMENT_NOT_FOUND" || e.code === "STEP_NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ error: e.message, code: e.code }, { status });
  }
  if (e instanceof IntegrationError) {
    return NextResponse.json({ error: e.safeMessage, code: e.code }, { status: 502 });
  }
  console.error(e);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function withDb<T>(fn: () => Promise<T>): Promise<T> {
  await connectDb();
  return fn();
}
