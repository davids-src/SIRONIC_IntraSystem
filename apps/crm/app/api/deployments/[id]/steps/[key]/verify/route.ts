import { NextResponse } from "next/server";
import { serializeForJson } from "@crm/db";
import { verifyStep } from "@crm/modules";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { buildStepClientsForTenant } from "@/lib/deployments/clients";
import { assertStepKey } from "@/lib/deployments/step-key";

type RouteCtx = { params: Promise<{ id: string; key: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  try {
    const { id, key } = await ctx.params;
    const stepKey = assertStepKey(key);
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "view", scope: "global" });

    return await withDb(async () => {
      const { clients, connections } = await buildStepClientsForTenant(actor.tenantId);
      const { deployment, result } = await verifyStep({
        tenantId: actor.tenantId,
        deploymentId: id,
        stepKey,
        actor,
        clients,
        connections,
      });
      return NextResponse.json({ ...result, deployment: serializeForJson(deployment) });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
