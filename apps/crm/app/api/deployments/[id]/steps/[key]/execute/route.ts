import { NextResponse } from "next/server";
import { z } from "zod";
import { DeploymentModel, serializeForJson } from "@crm/db";
import { executeStep } from "@crm/modules";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { buildStepClientsForTenant } from "@/lib/deployments/clients";
import { assertStepKey } from "@/lib/deployments/step-key";

type RouteCtx = { params: Promise<{ id: string; key: string }> };

const bodySchema = z
  .object({
    force: z.boolean().optional(),
    dry_run: z.boolean().optional(),
  })
  .passthrough();

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
    const { force, dry_run, ...input } = parsed.data;

    return await withDb(async () => {
      const { clients, connections } = await buildStepClientsForTenant(actor.tenantId);
      await executeStep({
        tenantId: actor.tenantId,
        deploymentId: id,
        stepKey,
        actor,
        clients,
        connections,
        input,
        force,
        dryRun: dry_run,
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
