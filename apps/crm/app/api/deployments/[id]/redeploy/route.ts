import { NextResponse } from "next/server";
import { z } from "zod";
import { DeploymentEventModel, DeploymentModel, serializeForJson } from "@crm/db";
import { executeStep } from "@crm/modules";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { buildStepClientsForTenant } from "@/lib/deployments/clients";

type RouteCtx = { params: Promise<{ id: string }> };

const bodySchema = z.object({ tag: z.string().optional() });

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "provision", scope: "global" });
    const json: unknown = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    return await withDb(async () => {
      if (parsed.data.tag) {
        await DeploymentModel.updateOne(
          { _id: id, tenantId: actor.tenantId },
          { $set: { "image.tag": parsed.data.tag } },
        );
      }
      const { clients, connections } = await buildStepClientsForTenant(actor.tenantId);
      await executeStep({
        tenantId: actor.tenantId,
        deploymentId: id,
        stepKey: "stack_deploy",
        actor,
        clients,
        connections,
        force: true,
      });
      await DeploymentEventModel.create({
        tenantId: actor.tenantId,
        deployment_id: id,
        step_key: "stack_deploy",
        kind: "redeploy",
        actor_id: actor.actorId,
        actor_type: "crm_user",
        message: parsed.data.tag
          ? `Redeploy új image taggel: ${parsed.data.tag}`
          : "Redeploy indítva.",
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
