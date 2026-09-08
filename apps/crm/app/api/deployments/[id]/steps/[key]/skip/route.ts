import { NextResponse } from "next/server";
import { z } from "zod";
import { DeploymentModel, serializeForJson } from "@crm/db";
import { skipStep } from "@crm/modules";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { assertStepKey } from "@/lib/deployments/step-key";

type RouteCtx = { params: Promise<{ id: string; key: string }> };

const bodySchema = z.object({ reason: z.string().optional() });

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const { id, key } = await ctx.params;
    const stepKey = assertStepKey(key);
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "provision", scope: "global" });
    const json: unknown = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    return await withDb(async () => {
      await skipStep({
        tenantId: actor.tenantId,
        deploymentId: id,
        stepKey,
        actor,
        reason: parsed.data.reason,
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
