import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeForJson } from "@crm/db";
import { runNextSteps } from "@crm/modules";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { buildStepClientsForTenant } from "@/lib/deployments/clients";

type RouteCtx = { params: Promise<{ id: string }> };

const bodySchema = z.object({ max_steps: z.number().int().positive().max(8).optional() });

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
      const { clients, connections } = await buildStepClientsForTenant(actor.tenantId);
      const { deployment, result } = await runNextSteps({
        tenantId: actor.tenantId,
        deploymentId: id,
        actor,
        clients,
        connections,
        maxSteps: parsed.data.max_steps,
      });
      return NextResponse.json({
        ran: result.ran,
        blocked: result.blocked,
        deployment: serializeForJson(deployment),
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
