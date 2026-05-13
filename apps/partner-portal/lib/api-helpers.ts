import { NextResponse } from "next/server";
import { toActorContext } from "@crm/auth";
import { connectDb } from "@crm/db";
import { authorizeOrThrow, ForbiddenError } from "@crm/modules";
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

export function guard(actor: ActorContext, check: PermissionCheck): void {
  authorizeOrThrow(actor, check);
}

export async function requirePortalAuth(): Promise<{
  portalUserId: string;
  tenantId: string;
  contactId: string;
  roleKeys: RoleKey[];
}> {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (
    !session?.user?.id ||
    !session.user.tenantId ||
    !session.user.contactId ||
    !session.user.roleKeys?.length
  ) {
    throw new HttpError(401, "Unauthorized");
  }
  return {
    portalUserId: session.user.id,
    tenantId: session.user.tenantId,
    contactId: session.user.contactId,
    roleKeys: session.user.roleKeys as RoleKey[],
  };
}

export async function requirePortalActor(): Promise<{
  portalUserId: string;
  tenantId: string;
  contactId: string;
  roleKeys: RoleKey[];
  actor: ActorContext;
}> {
  const base = await requirePortalAuth();
  return {
    ...base,
    actor: toActorContext({
      userId: base.portalUserId,
      tenantId: base.tenantId,
      roleKeys: base.roleKeys,
    }),
  };
}

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  if (e instanceof ForbiddenError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  console.error(e);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function withDb<T>(fn: () => Promise<T>): Promise<T> {
  await connectDb();
  return fn();
}
