import { NextResponse } from "next/server";
import { planStep } from "@crm/modules";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { buildStepClientsForTenant } from "@/lib/deployments/clients";
import { assertStepKey } from "@/lib/deployments/step-key";

type RouteCtx = { params: Promise<{ id: string; key: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const { id, key } = await ctx.params;
    const stepKey = assertStepKey(key);
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "provision", scope: "global" });
    const input: Record<string, unknown> = await req.json().catch(() => ({}));

    return await withDb(async () => {
      const { clients, connections } = await buildStepClientsForTenant(actor.tenantId);
      const { result } = await planStep({
        tenantId: actor.tenantId,
        deploymentId: id,
        stepKey,
        actor,
        clients,
        connections,
        input,
      });
      return NextResponse.json(result);
    });
  } catch (e) {
    return handleApiError(e);
  }
}
