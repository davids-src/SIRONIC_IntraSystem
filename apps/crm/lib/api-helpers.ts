import { NextResponse } from "next/server";
import { auth } from "../auth";
import { toActorContext, type AuthSession } from "@crm/auth";
import { ForbiddenError, OrchestratorError, authorizeOrThrow } from "@crm/modules";
import { IntegrationError } from "@crm/integrations";
import { connectDb } from "@crm/db";
import type { ActorContext, PermissionCheck, RoleKey } from "@crm/types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function requireCrmAuth() {
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
