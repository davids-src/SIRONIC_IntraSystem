import type { ActorContext } from "@crm/types";

export interface AuthSession {
  userId: string;
  tenantId: string;
  roleKeys: ActorContext["roleKeys"];
}

export function toActorContext(session: AuthSession): ActorContext {
  return {
    actorId: session.userId,
    tenantId: session.tenantId,
    roleKeys: session.roleKeys,
  };
}
