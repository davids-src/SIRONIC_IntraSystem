import { NextResponse } from "next/server";
import { CrmUserModel, DeploymentModel, serializeForJson } from "@crm/db";
import type { Deployment } from "@crm/types";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * Read-only: which ERP (crm.admin) staff currently have standing platform access to this
 * deployment, plus the last push status. There is no per-deployment grant to add/remove here —
 * every crm.admin is synced to every deployment as a non-revocable `source:"erp"` admin
 * (packages/lib/src/deployments/admin-sync.ts); managing *who* that is happens on the Team page
 * (crm.admin role), not per-site. Gated on `deployment:admin` (crm.admin only), not just `:view`,
 * since crm.staff can view deployments but must not see/manage ERP-level platform access.
 */
export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "admin", scope: "global" });

    return await withDb(async () => {
      const deployment = (await DeploymentModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      })
        .select("admin_sync")
        .lean()) as unknown as Pick<Deployment, "admin_sync"> | null;
      if (!deployment) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const admins = await CrmUserModel.find({
        tenantId: actor.tenantId,
        roleKeys: "crm.admin",
      })
        .select("email display_name")
        .sort({ email: 1 })
        .lean();

      return NextResponse.json(
        serializeForJson({
          admins,
          admin_sync: deployment.admin_sync ?? null,
        }),
      );
    });
  } catch (e) {
    return handleApiError(e);
  }
}
