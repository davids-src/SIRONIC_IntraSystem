import { NextResponse } from "next/server";
import { DeploymentModel, PartnerDeploymentAccessModel, serializeForJson } from "@crm/db";
import type { Deployment } from "@crm/types";
import { guard, handleApiError, requirePortalActor, withDb } from "@/lib/api-helpers";
import { redactDeploymentForPartner } from "@/lib/deployment-redact";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { tenantId, contactId, portalUserId, roleKeys, actor } =
      await requirePortalActor();
    guard(actor, { module: "deployment", action: "view", scope: "contact" });

    return await withDb(async () => {
      const doc = (await DeploymentModel.findOne({
        _id: id,
        tenantId,
        contact_id: contactId,
      }).lean()) as unknown as Deployment | null;
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (!roleKeys.includes("partner.admin")) {
        const access = await PartnerDeploymentAccessModel.findOne({
          tenantId,
          contact_id: contactId,
          portal_user_id: portalUserId,
          deployment_id: id,
        }).lean();
        if (!access) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
      }

      return NextResponse.json(serializeForJson(redactDeploymentForPartner(doc)));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
