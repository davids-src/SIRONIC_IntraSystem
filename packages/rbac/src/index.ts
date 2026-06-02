import type { ActorContext, Permission, PermissionCheck, RoleKey } from "@crm/types";

const rolePermissions: Record<RoleKey, Permission[]> = {
  "crm.admin": [
    { module: "dashboard", action: "view", scope: "global" },
    { module: "contact", action: "admin", scope: "global" },
    { module: "price_list", action: "admin", scope: "global" },
    { module: "offer", action: "admin", scope: "global" },
    { module: "invoice", action: "admin", scope: "global" },
    { module: "ticket", action: "admin", scope: "global" },
    { module: "worklog", action: "admin", scope: "global" },
    { module: "completion_certificate", action: "admin", scope: "global" },
    { module: "contract", action: "admin", scope: "global" },
    { module: "portal_permissions", action: "manage", scope: "global" },
    { module: "project", action: "admin", scope: "global" },
    { module: "settings", action: "admin", scope: "global" },
    { module: "delivery_note", action: "admin", scope: "global" },
    { module: "secret", action: "admin", scope: "global" },
  ],
  "crm.staff": [
    { module: "dashboard", action: "view", scope: "global" },
    { module: "contact", action: "write", scope: "global" },
    { module: "price_list", action: "write", scope: "global" },
    { module: "offer", action: "write", scope: "global" },
    { module: "invoice", action: "write", scope: "global" },
    { module: "ticket", action: "write", scope: "global" },
    { module: "ticket", action: "internal_comment", scope: "global" },
    { module: "worklog", action: "write", scope: "global" },
    { module: "worklog", action: "finalize", scope: "global" },
    { module: "worklog", action: "generate_pdf", scope: "global" },
    { module: "completion_certificate", action: "write", scope: "global" },
    { module: "completion_certificate", action: "send", scope: "global" },
    { module: "completion_certificate", action: "generate_pdf", scope: "global" },
    { module: "contract", action: "write", scope: "global" },
    { module: "contract", action: "send", scope: "global" },
    { module: "contract", action: "generate_pdf", scope: "global" },
    { module: "project", action: "write", scope: "global" },
    { module: "project", action: "manage_phases", scope: "global" },
    { module: "project", action: "manage_checklist", scope: "global" },
    { module: "project", action: "add_staging_link", scope: "global" },
    { module: "project", action: "close", scope: "global" },
    { module: "delivery_note", action: "write", scope: "global" },
    { module: "secret", action: "write", scope: "global" },
    { module: "settings", action: "view", scope: "global" },
  ],

  "partner.admin": [
    { module: "dashboard", action: "view", scope: "contact" },
    { module: "price_list", action: "view", scope: "contact" },
    { module: "offer", action: "admin", scope: "contact" },
    { module: "invoice", action: "view", scope: "contact" },
    { module: "ticket", action: "write", scope: "contact" },
    { module: "worklog", action: "view", scope: "contact" },
    { module: "completion_certificate", action: "sign", scope: "contact" },
    { module: "completion_certificate", action: "view", scope: "contact" },
    { module: "contract", action: "view", scope: "contact" },
    { module: "contract", action: "sign", scope: "contact" },
    { module: "project", action: "view", scope: "contact" },
    { module: "project", action: "manage_checklist", scope: "contact" },
    { module: "project", action: "sign", scope: "contact" }, // reusing 'sign' for approval
  ],
  "partner.viewer": [
    { module: "dashboard", action: "view", scope: "contact" },
    { module: "offer", action: "view", scope: "contact" },
    { module: "invoice", action: "view", scope: "contact" },
    { module: "ticket", action: "view", scope: "contact" },
    { module: "worklog", action: "view", scope: "contact" },
    { module: "completion_certificate", action: "view", scope: "contact" },
    { module: "contract", action: "view", scope: "contact" },
    { module: "project", action: "view", scope: "contact" },
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

  if (grantedScope === "contact") {
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
