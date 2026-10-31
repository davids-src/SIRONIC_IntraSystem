import { NextResponse } from "next/server";
import { PartnerDeploymentAccessModel, PortalUserModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

/** Read-only — all writes to partner deployment access happen in the partner portal's /team. */
export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "view", scope: "global" });

    return await withDb(async () => {
      const rows = await PartnerDeploymentAccessModel.find({
        tenantId: actor.tenantId,
        deployment_id: id,
      }).lean();
      const users = await PortalUserModel.find({
        tenantId: actor.tenantId,
        _id: { $in: rows.map((r) => r.portal_user_id) },
      }).lean();
      const byId = new Map(users.map((u) => [String(u._id), u]));

      const result = rows.map((row) => {
        const user = byId.get(row.portal_user_id);
        return {
          ...row,
          portal_user_email: user?.email ?? null,
          portal_user_display_name: user?.display_name ?? null,
        };
      });
      return NextResponse.json(serializeForJson(result));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
