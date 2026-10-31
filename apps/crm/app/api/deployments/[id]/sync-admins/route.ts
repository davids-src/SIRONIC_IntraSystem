import { NextResponse } from "next/server";
import { DeploymentModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { syncDeploymentAdmins } from "@crm/lib/server";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "provision", scope: "global" });

    return await withDb(async () => {
      const result = await syncDeploymentAdmins({
        tenantId: actor.tenantId,
        deploymentId: id,
        actor,
      });
      const doc = await DeploymentModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ...result, deployment: serializeForJson(doc) });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
