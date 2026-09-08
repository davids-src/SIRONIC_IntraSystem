import { NextResponse } from "next/server";
import { z } from "zod";
import { DeploymentModel, serializeForJson } from "@crm/db";
import { adoptStep } from "@crm/modules";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { buildStepClientsForTenant } from "@/lib/deployments/clients";
import { assertStepKey } from "@/lib/deployments/step-key";

type RouteCtx = { params: Promise<{ id: string; key: string }> };

const bodySchema = z.object({
  external_id: z.string().min(1),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const { id, key } = await ctx.params;
    const stepKey = assertStepKey(key);
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "adopt", scope: "global" });
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    return await withDb(async () => {
      const { clients, connections } = await buildStepClientsForTenant(actor.tenantId);
      await adoptStep({
        tenantId: actor.tenantId,
        deploymentId: id,
        stepKey,
        actor,
        clients,
        connections,
        input: parsed.data.meta ?? {},
        externalId: parsed.data.external_id,
      });
      const doc = await DeploymentModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
