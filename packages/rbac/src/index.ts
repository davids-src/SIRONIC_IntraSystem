import type { ActorContext, Permission, PermissionCheck, RoleKey } from "@crm/types";

const rolePermissions: Record<RoleKey, Permission[]> = {
  "crm.admin": [
    { module: "dashboard", action: "view", scope: "global" },
    { module: "organization", action: "admin", scope: "global" },
    { module: "inventory", action: "admin", scope: "global" },
    { module: "offer", action: "admin", scope: "global" },
    { module: "ticket", action: "admin", scope: "global" },
    { module: "worklog", action: "admin", scope: "global" },
    { module: "completion_certificate", action: "admin", scope: "global" },
    { module: "portal_permissions", action: "manage", scope: "global" },
    { module: "project", action: "admin", scope: "global" },
  ],
  "crm.staff": [
    { module: "dashboard", action: "view", scope: "global" },
    { module: "organization", action: "write", scope: "global" },
    { module: "inventory", action: "write", scope: "global" },
    { module: "offer", action: "write", scope: "global" },
    { module: "ticket", action: "write", scope: "global" },
    { module: "ticket", action: "internal_comment", scope: "global" },
    { module: "worklog", action: "write", scope: "global" },
    { module: "worklog", action: "finalize", scope: "global" },
    { module: "worklog", action: "generate_pdf", scope: "global" },
    { module: "completion_certificate", action: "write", scope: "global" },
    { module: "completion_certificate", action: "send", scope: "global" },
    { module: "completion_certificate", action: "generate_pdf", scope: "global" },
    { module: "project", action: "write", scope: "global" },
    { module: "project", action: "manage_phases", scope: "global" },
    { module: "project", action: "manage_checklist", scope: "global" },
    { module: "project", action: "add_staging_link", scope: "global" },
    { module: "project", action: "close", scope: "global" },
  ],
  "partner.admin": [
    { module: "dashboard", action: "view", scope: "organization" },
    { module: "inventory", action: "view", scope: "organization" },
    { module: "offer", action: "admin", scope: "organization" },
    { module: "ticket", action: "write", scope: "organization" },
    { module: "worklog", action: "view", scope: "organization" },
    { module: "completion_certificate", action: "sign", scope: "organization" },
    { module: "completion_certificate", action: "view", scope: "organization" },
    { module: "project", action: "view", scope: "organization" },
    { module: "project", action: "manage_checklist", scope: "organization" },
    { module: "project", action: "sign", scope: "organization" }, // reusing 'sign' for approval
  ],
  "partner.viewer": [
    { module: "dashboard", action: "view", scope: "organization" },
    { module: "offer", action: "view", scope: "organization" },
    { module: "ticket", action: "view", scope: "organization" },
    { module: "worklog", action: "view", scope: "organization" },
    { module: "completion_certificate", action: "view", scope: "organization" },
    { module: "project", action: "view", scope: "organization" },
  ],
};

const actionWeight: Record<Permission["action"], number> = {
  view: 1,
  write: 2,
  admin: 100,
  internal_comment: 10,
  finalize: 10,
  generate_pdf: 10,
  send: 10,
  sign: 10,
  manage: 10,
  manage_phases: 10,
  manage_checklist: 10,
  add_staging_link: 10,
  close: 10,
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

      if (grant.action === "admin") {
        return matchesScope(actor, check, grant.scope);
      }

      if (grant.action === check.action) {
        return matchesScope(actor, check, grant.scope);
      }

      if (
        check.action === "view" &&
        actionWeight[grant.action] >= actionWeight["write"]
      ) {
        return matchesScope(actor, check, grant.scope);
      }

      return false;
    });
  });
}
