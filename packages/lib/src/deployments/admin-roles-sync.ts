import { DeploymentModel } from "@crm/db";
import { httpRequest } from "@crm/integrations";
import type { Deployment } from "@crm/types";
import { decryptSecret } from "../secret-crypto";

export type PlatformAdminRole = "owner" | "admin" | "editor" | "viewer";

export type PlatformAdminRow = {
  id: string;
  email: string;
  displayName: string | null;
  role: PlatformAdminRole;
  permissions: string[];
  source: "local" | "bootstrap";
  editable: boolean;
  lastLoginAt: string | null;
};

/** Roles the partner portal may assign. `owner` is Sironic-staff only. */
export const PORTAL_ASSIGNABLE_PLATFORM_ROLES = ["admin", "editor", "viewer"] as const;

function httpErrorStatus(e: unknown): number | undefined {
  return e && typeof e === "object" && "httpStatus" in e
    ? ((e as { httpStatus?: number }).httpStatus ?? undefined)
    : undefined;
}

async function loadDeploymentToken(
  tenantId: string,
  deploymentId: string,
): Promise<{ deployment: Deployment; token: string } | { error: string }> {
  const deployment = (await DeploymentModel.findOne({
    _id: deploymentId,
    tenantId,
  }).lean()) as unknown as Deployment | null;
  if (!deployment) return { error: "Deployment not found" };
  if (!deployment.provision_token_encrypted) return { error: "no token" };
  return { deployment, token: decryptSecret(deployment.provision_token_encrypted) };
}

/** Drops any row that is somehow sourced from the ERP sync, even though the site's own
 * `GET /api/sironic/admin-roles` query already excludes `source:"erp"` server-side — belt
 * and suspenders for callers (e.g. partner-portal) that must never surface or touch one. */
function dropErpRows(admins: PlatformAdminRow[]): PlatformAdminRow[] {
  return admins.filter((a) => a.source !== ("erp" as PlatformAdminRow["source"]));
}

/**
 * Reads a deployed site's own (non-ERP) platform admins and their owner/admin/editor/viewer
 * role via the `/api/sironic/admin-roles` contract (sironic-platform `docs/plan/10-admin-roles-api.md`).
 * Distinct from `syncDeploymentAdmins`/`getDeploymentAdminsDrift`, which manage the ERP-sourced
 * `source:"erp"` rows pushed from the CRM — this is read/write access to the site's *own* admins.
 */
export async function getDeploymentPlatformRoles(
  tenantId: string,
  deploymentId: string,
): Promise<{ ok: boolean; admins?: PlatformAdminRow[]; error?: string }> {
  const loaded = await loadDeploymentToken(tenantId, deploymentId);
  if ("error" in loaded) return { ok: false, error: loaded.error };
  const { deployment, token } = loaded;

  try {
    const res = await httpRequest(
      `https://${deployment.domain}/api/sironic/admin-roles?deploymentId=${encodeURIComponent(deploymentId)}`,
      {
        provider: "deployment",
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
        retry: true,
      },
    );
    const json = res.json as { admins?: PlatformAdminRow[] } | null;
    return { ok: true, admins: dropErpRows(json?.admins ?? []) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Platform role fetch failed.";
    return { ok: false, error: message };
  }
}

/**
 * Updates a site admin's platform role and/or permission strings via `PATCH
 * /api/sironic/admin-roles/{id}`. The site enforces, atomically in its own update query, that
 * `source:"erp"` and `role:"owner"` rows can never be targeted — this is not re-derivable here
 * since the id alone doesn't say which row it is, so callers must not treat a 403 as unexpected.
 */
export async function updateDeploymentPlatformRole(params: {
  tenantId: string;
  deploymentId: string;
  adminId: string;
  role?: (typeof PORTAL_ASSIGNABLE_PLATFORM_ROLES)[number];
  permissions?: string[];
}): Promise<{ ok: boolean; admin?: PlatformAdminRow; error?: string }> {
  const { tenantId, deploymentId, adminId, role, permissions } = params;
  const loaded = await loadDeploymentToken(tenantId, deploymentId);
  if ("error" in loaded) return { ok: false, error: loaded.error };
  const { deployment, token } = loaded;

  try {
    const res = await httpRequest(
      `https://${deployment.domain}/api/sironic/admin-roles/${encodeURIComponent(adminId)}`,
      {
        provider: "deployment",
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: {
          deploymentId,
          ...(role ? { role } : {}),
          ...(permissions ? { permissions } : {}),
        },
        // Not idempotent in the create sense, but a PATCH retried after a timeout just re-applies
        // the same role/permissions set — safe to retry like the admin-sync PUT.
        retry: true,
      },
    );
    const json = res.json as { admin?: PlatformAdminRow } | null;
    if (json?.admin && json.admin.source === ("erp" as PlatformAdminRow["source"])) {
      return { ok: false, error: "Refused to apply to an ERP-managed admin." };
    }
    return { ok: true, admin: json?.admin };
  } catch (e) {
    const status = httpErrorStatus(e);
    const message = e instanceof Error ? e.message : "Platform role update failed.";
    if (status === 403) {
      return {
        ok: false,
        error: "Ez az admin ERP által kezelt, vagy tulajdonos — itt nem módosítható.",
      };
    }
    return { ok: false, error: message };
  }
}
