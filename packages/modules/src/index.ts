import { hasPermission } from "@crm/rbac";
import type { ActorContext, PermissionCheck } from "@crm/types";

export function authorizeOrThrow(actor: ActorContext, permission: PermissionCheck): void {
  if (!hasPermission(actor, permission)) {
    throw new Error("Forbidden");
  }
}
