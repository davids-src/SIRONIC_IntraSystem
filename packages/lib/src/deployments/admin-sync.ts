import {
  DeploymentEventModel,
  DeploymentModel,
  PartnerDeploymentAccessModel,
  PortalUserModel,
} from "@crm/db";
import { httpRequest } from "@crm/integrations";
import type { ActorContext, Deployment, RoleKey } from "@crm/types";
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
  if (accessRows.length === 0) return [];

  const portalUsers = await PortalUserModel.find({
    tenantId,
    _id: { $in: accessRows.map((r) => r.portal_user_id) },
  }).lean();
  const byId = new Map(portalUsers.map((u) => [String(u._id), u]));

  const admins: SyncAdmin[] = [];
  for (const row of accessRows) {
    const user = byId.get(row.portal_user_id);
    if (!user) continue;
    const roleKeys = (user.roleKeys ?? []) as string[];
    admins.push({
      email: user.email,
      displayName: user.display_name ?? null,
      role: roleKeys.includes("partner.admin") ? "admin" : "viewer",
      platformUserId: String(user._id),
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
        retry: false,
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
      retry: false,
    });
    return { ok: true, admins: res.json };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Drift check failed." };
  }
}
