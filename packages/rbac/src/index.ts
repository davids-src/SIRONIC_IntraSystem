import type { ActorContext, Permission, PermissionCheck, RoleKey } from "@crm/types";

const rolePermissions: Record<RoleKey, Permission[]> = {
  "crm.admin": [
    { module: "dashboard", action: "view", scope: "global" },
    { module: "organization", action: "admin", scope: "global" },
    { module: "inventory", action: "admin", scope: "global" },
    { module: "offer", action: "admin", scope: "global" },
  ],
  "crm.staff": [
    { module: "dashboard", action: "view", scope: "global" },
    { module: "organization", action: "write", scope: "global" },
    { module: "inventory", action: "write", scope: "global" },
    { module: "offer", action: "write", scope: "global" },
  ],
  "partner.admin": [
    { module: "dashboard", action: "view", scope: "organization" },
    { module: "inventory", action: "view", scope: "organization" },
    { module: "offer", action: "admin", scope: "organization" },
  ],
  "partner.viewer": [
    { module: "dashboard", action: "view", scope: "organization" },
    { module: "offer", action: "view", scope: "organization" },
  ],
};

const actionWeight: Record<Permission["action"], number> = {
  view: 1,
  write: 2,
  admin: 3,
};

function matchesScope(
  actor: ActorContext,
  check: PermissionCheck,
  grantedScope: Permission["scope"],
): boolean {
  if (grantedScope === "global") {
    return true;
  }

  if (grantedScope === "organization") {
    if (!check.resourceTenantId) {
      return actor.tenantId.length > 0;
    }

    return actor.tenantId === check.resourceTenantId;
  }

  return Boolean(check.resourceTenantId) && actor.tenantId === check.resourceTenantId;
}

export function hasPermission(actor: ActorContext, check: PermissionCheck): boolean {
  return actor.roleKeys.some((roleKey) => {
    const grants = rolePermissions[roleKey];

    return grants.some((grant) => {
      if (grant.module !== check.module) {
        return false;
      }

      if (actionWeight[grant.action] < actionWeight[check.action]) {
        return false;
      }

      return matchesScope(actor, check, grant.scope);
    });
  });
}
