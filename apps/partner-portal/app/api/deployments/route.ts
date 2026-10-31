import { NextResponse } from "next/server";
import { DeploymentModel, PartnerDeploymentAccessModel, serializeForJson } from "@crm/db";
import type { Deployment } from "@crm/types";
import { guard, handleApiError, requirePortalActor, withDb } from "@/lib/api-helpers";
import { redactDeploymentForPartner } from "@/lib/deployment-redact";

export async function GET() {
  try {
    const { tenantId, contactId, portalUserId, roleKeys, actor } =
      await requirePortalActor();
    guard(actor, { module: "deployment", action: "view", scope: "contact" });

    return await withDb(async () => {
      let rows: unknown[];
      if (roleKeys.includes("partner.admin")) {
        rows = await DeploymentModel.find({
          tenantId,
          contact_id: contactId,
          status: { $ne: "archived" },
        })
          .sort({ updated_at: -1 })
          .lean();
      } else {
        const accessRows = await PartnerDeploymentAccessModel.find({
          tenantId,
          contact_id: contactId,
          portal_user_id: portalUserId,
        }).lean();
        const deploymentIds = accessRows.map((r) => r.deployment_id);
        rows = await DeploymentModel.find({
          tenantId,
          contact_id: contactId,
          _id: { $in: deploymentIds },
          status: { $ne: "archived" },
        })
          .sort({ updated_at: -1 })
          .lean();
      }

      const redacted = (rows as unknown as Deployment[]).map(redactDeploymentForPartner);
      return NextResponse.json(serializeForJson(redacted));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
