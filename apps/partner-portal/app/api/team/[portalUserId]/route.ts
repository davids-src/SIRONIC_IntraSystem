import { NextResponse } from "next/server";
import { PartnerDeploymentAccessModel, PortalUserModel } from "@crm/db";
import { syncDeploymentAdmins } from "@crm/lib/server";
import { guard, handleApiError, requirePortalActor, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ portalUserId: string }> };

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const { portalUserId } = await ctx.params;
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "partner_team", action: "manage", scope: "contact" });

    return await withDb(async () => {
      const user = await PortalUserModel.findOne({
        _id: portalUserId,
        tenantId,
        contact_id: contactId,
      }).lean();
      if (!user) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const accessRows = await PartnerDeploymentAccessModel.find({
        tenantId,
        portal_user_id: portalUserId,
      }).lean();
      const affectedDeploymentIds = [...new Set(accessRows.map((r) => r.deployment_id))];

      await PartnerDeploymentAccessModel.deleteMany({
        tenantId,
        portal_user_id: portalUserId,
      });
      await PortalUserModel.deleteOne({ _id: portalUserId, tenantId });

      for (const deploymentId of affectedDeploymentIds) {
        void syncDeploymentAdmins({ tenantId, deploymentId, actor });
      }

      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
