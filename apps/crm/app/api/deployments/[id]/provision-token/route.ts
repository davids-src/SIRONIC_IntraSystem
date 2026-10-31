import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { DeploymentEventModel, DeploymentModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { encryptSecret } from "@/lib/secret-crypto";

type RouteCtx = { params: Promise<{ id: string }> };

const bodySchema = z.object({ action: z.enum(["generate", "rotate"]) });

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
      const existing = await DeploymentModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const token = crypto.randomBytes(32).toString("hex");
      await DeploymentModel.updateOne(
        { _id: id, tenantId: actor.tenantId },
        { $set: { provision_token_encrypted: encryptSecret(token) } },
      );
      await DeploymentEventModel.create({
        tenantId: actor.tenantId,
        deployment_id: id,
        step_key: null,
        kind: "note",
        actor_id: actor.actorId,
        actor_type: "crm_user",
        message:
          parsed.data.action === "rotate"
            ? "Provisioning token rotated."
            : "Provisioning token generated.",
      });

      const doc = await DeploymentModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      return NextResponse.json({
        token,
        stack_env_hint: { name: "SIRONIC_PROVISION_TOKEN", value: token },
        deployment: serializeForJson(doc),
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
