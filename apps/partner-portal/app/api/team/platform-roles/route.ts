import { NextResponse } from "next/server";
import { DeploymentModel } from "@crm/db";
import { getDeploymentPlatformRoles } from "@crm/lib/server";
import { guard, handleApiError, requirePortalActor, withDb } from "@/lib/api-helpers";

async function assertOwnDeployment(
  tenantId: string,
  contactId: string,
  deploymentId: string,
) {
  const dep = await DeploymentModel.findOne({
    _id: deploymentId,
    tenantId,
    contact_id: contactId,
  }).lean();
  return dep != null;
}

/** Platform-level (owner/admin/editor/viewer) role list for the partner's own deployed site —
 * distinct from `/api/team/access`, which is this portal's own view/manage grants. Never
 * returns `source:"erp"` rows: the site's own query excludes them, and `getDeploymentPlatformRoles`
 * filters again as defense in depth. */
export async function GET(req: Request) {
  try {
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "partner_team", action: "manage", scope: "contact" });
    const deploymentId = new URL(req.url).searchParams.get("deployment_id");
    if (!deploymentId) {
      return NextResponse.json({ error: "deployment_id required" }, { status: 400 });
    }

    return await withDb(async () => {
      if (!(await assertOwnDeployment(tenantId, contactId, deploymentId))) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const result = await getDeploymentPlatformRoles(tenantId, deploymentId);
      return NextResponse.json(result);
    });
  } catch (e) {
    return handleApiError(e);
  }
}
