import {
  CrmUserModel,
  DeploymentEventModel,
  DeploymentModel,
  PartnerDeploymentAccessModel,
  PortalUserModel,
} from "@crm/db";
import { httpRequest } from "@crm/integrations";
import type { ActorContext, Deployment, RoleKey } from "@crm/types";
import {
  connectSecondaryAuthDb,
  platformUserModelFor,
  findOrCreatePlatformUserByEmail,
} from "@crm/auth-core/server";
import { decryptSecret } from "../secret-crypto";

type SyncAdmin = {
  email: string;
  displayName: string | null;
  role: "admin" | "viewer";
  platformUserId: string;
};

function actorTypeFor(roleKeys: RoleKey[]): "crm_user" | "portal_user" | "system" {
  if (roleKeys.some((r) => r === "crm.admin" || r === "crm.staff")) return "crm_user";
  if (roleKeys.some((r) => r === "partner.admin" || r === "partner.viewer"))
    return "portal_user";
  return "system";
}

async function buildAdminsPayload(
  tenantId: string,
  deploymentId: string,
): Promise<SyncAdmin[]> {
  const accessRows = await PartnerDeploymentAccessModel.find({
    tenantId,
    deployment_id: deploymentId,
  }).lean();

  const portalUsers = accessRows.length
    ? await PortalUserModel.find({
        tenantId,
        _id: { $in: accessRows.map((r) => r.portal_user_id) },
      }).lean()
    : [];
  const byId = new Map(portalUsers.map((u) => [String(u._id), u]));

  // Every ERP admin gets standing access to every deployed site — the agency hosts and
  // operates these sites on the partner's behalf, so access can't be something a partner's
  // own admin screen can revoke. `source: "erp"` rows are protected from removal/edits by
  // the site's own admin-management UI (sironic-platform packages/auth/admin-management.ts
  // loadTarget()); a full idempotent sync here means any attempt to delete one is undone on
  // the next sync.
  const crmAdmins = await CrmUserModel.find({
    tenantId,
    roleKeys: "crm.admin",
  }).lean();

  // The deployed site's own login is now OIDC — its `sub` claim is PlatformUser._id, not
  // this PortalUser's/CrmUser's own _id. Resolve (or create, first time) the real
  // PlatformUser per admin so the id this push tells the site to expect is the same one
  // OIDC login produces, and cache it on the PortalUser row so repeat syncs don't re-resolve
  // it every time. CrmUserModel has no such cache field, so it's resolved fresh each sync —
  // findOrCreatePlatformUserByEmail is idempotent, so that's just a (cheap) read in practice.
  const authConnection = await connectSecondaryAuthDb();
  const platformUserModel = platformUserModelFor(authConnection);

  const admins: SyncAdmin[] = [];
  const seenEmails = new Set<string>();

  for (const row of accessRows) {
    const user = byId.get(row.portal_user_id);
    if (!user) continue;
    const roleKeys = (user.roleKeys ?? []) as string[];

    let platformUserId = (user as { platform_user_id?: string | null }).platform_user_id;
    if (!platformUserId) {
      const platformUser = await findOrCreatePlatformUserByEmail(
        user.email,
        user.display_name ?? null,
        platformUserModel,
      );
      platformUserId = String(platformUser._id);
      await PortalUserModel.updateOne(
        { _id: user._id, platform_user_id: null },
        { $set: { platform_user_id: platformUserId } },
      );
    }

    seenEmails.add(user.email);
    admins.push({
      email: user.email,
      displayName: user.display_name ?? null,
      role: roleKeys.includes("partner.admin") ? "admin" : "viewer",
      platformUserId,
    });
  }

  for (const user of crmAdmins) {
    if (seenEmails.has(user.email)) continue; // already pushed via partner access, don't duplicate
    seenEmails.add(user.email);
    const platformUser = await findOrCreatePlatformUserByEmail(
      user.email,
      user.display_name ?? null,
      platformUserModel,
    );
    admins.push({
      email: user.email,
      displayName: user.display_name ?? null,
      role: "admin",
      platformUserId: String(platformUser._id),
    });
  }

  return admins;
}

async function writeEvent(params: {
  tenantId: string;
  deploymentId: string;
  actor: ActorContext;
  message: string;
  detail?: unknown;
  duration_ms?: number;
}): Promise<void> {
  await DeploymentEventModel.create({
    tenantId: params.tenantId,
    deployment_id: params.deploymentId,
    step_key: null,
    kind: "admin_sync",
    actor_id: params.actor.actorId,
    actor_type: actorTypeFor(params.actor.roleKeys),
    message: params.message,
    detail: params.detail ?? null,
    duration_ms: params.duration_ms ?? null,
  });
}

/**
 * Pushes the current admin list to a deployed site via the agreed `/api/sironic/admins`
 * contract. Never throws — every outcome (including "no token yet") is captured on
 * `Deployment.admin_sync` and a `DeploymentEvent`, so callers can fire-and-forget this.
 * Shared between apps/crm (manual "Sync now") and apps/partner-portal (access-matrix writes).
 */
export async function syncDeploymentAdmins(params: {
  tenantId: string;
  deploymentId: string;
  actor: ActorContext;
}): Promise<{ ok: boolean; status: number | null; error?: string }> {
  const { tenantId, deploymentId, actor } = params;
  const started = Date.now();

  try {
    const deployment = (await DeploymentModel.findOne({
      _id: deploymentId,
      tenantId,
    }).lean()) as unknown as Deployment | null;
    if (!deployment) {
      return { ok: false, status: null, error: "Deployment not found" };
    }
    if (!deployment.provision_token_encrypted) {
      await writeEvent({
        tenantId,
        deploymentId,
        actor,
        message: "Admin sync skipped: no provisioning token generated yet.",
      });
      return { ok: false, status: null, error: "no token" };
    }

    const admins = await buildAdminsPayload(tenantId, deploymentId);
    const token = decryptSecret(deployment.provision_token_encrypted);

    let response: { status: number; json: unknown };
    try {
      const res = await httpRequest(`https://${deployment.domain}/api/sironic/admins`, {
        provider: "deployment",
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: { deploymentId, admins },
        // Site rate-limits to 10 req/min and returns 429 with Retry-After — honor it instead
        // of failing the sync outright. PUT is a full idempotent sync, safe to retry.
        retry: true,
      });
      response = { status: res.status, json: res.json };
    } catch (e) {
      const status =
        e && typeof e === "object" && "httpStatus" in e
          ? ((e as { httpStatus?: number }).httpStatus ?? null)
          : null;
      const message = e instanceof Error ? e.message : "Admin sync request failed.";
      await DeploymentModel.updateOne(
        { _id: deploymentId, tenantId },
        {
          $set: {
            admin_sync: {
              status: "error",
              last_synced_at: new Date(),
              last_error: message,
              last_admins_count: admins.length,
            },
          },
        },
      );
      await writeEvent({
        tenantId,
        deploymentId,
        actor,
        message: `Admin sync failed: ${message}`,
        duration_ms: Date.now() - started,
      });
      return { ok: false, status, error: message };
    }

    await DeploymentModel.updateOne(
      { _id: deploymentId, tenantId },
      {
        $set: {
          admin_sync: {
            status: "ok",
            last_synced_at: new Date(),
            last_error: null,
            last_admins_count: admins.length,
          },
        },
      },
    );
    await writeEvent({
      tenantId,
      deploymentId,
      actor,
      message: `Admin sync ok (${admins.length} admin).`,
      detail: { request: admins, response: response.json },
      duration_ms: Date.now() - started,
    });
    return { ok: true, status: response.status };
  } catch (e) {
    // Last-resort guard — this function must never throw for fire-and-forget callers.
    const message = e instanceof Error ? e.message : "Unknown admin sync error.";
    try {
      await writeEvent({
        tenantId,
        deploymentId,
        actor,
        message: `Admin sync failed: ${message}`,
      });
    } catch {
      // swallow — logging failure must not surface either
    }
    return { ok: false, status: null, error: message };
  }
}

/** Drift check: fetches the site's current `source:"erp"` admin rows without pushing changes. */
export async function getDeploymentAdminsDrift(
  tenantId: string,
  deploymentId: string,
): Promise<{ ok: boolean; admins?: unknown; error?: string }> {
  const deployment = (await DeploymentModel.findOne({
    _id: deploymentId,
    tenantId,
  }).lean()) as unknown as Deployment | null;
  if (!deployment) return { ok: false, error: "Deployment not found" };
  if (!deployment.provision_token_encrypted) return { ok: false, error: "no token" };

  const token = decryptSecret(deployment.provision_token_encrypted);
  try {
    const res = await httpRequest(`https://${deployment.domain}/api/sironic/admins`, {
      provider: "deployment",
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
      retry: true,
    });
    return { ok: true, admins: res.json };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Drift check failed." };
  }
}
