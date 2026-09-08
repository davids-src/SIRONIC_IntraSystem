import { NextResponse } from "next/server";
import { DeploymentModel, serializeForJson } from "@crm/db";
import type { Deployment } from "@crm/types";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

const IMMUTABLE_FIELDS = [
  "_id",
  "tenantId",
  "deployment_number",
  "created_by",
  "created_at",
  "steps",
  "external_ids",
];

function hasAnyExternalId(deployment: Deployment): boolean {
  return Object.values(deployment.external_ids).some((v) =>
    Array.isArray(v) ? v.length > 0 : v != null,
  );
}

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "view", scope: "global" });
    return await withDb(async () => {
      const doc = await DeploymentModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "write", scope: "global" });
    const patch: Record<string, unknown> = await req.json();
    for (const field of IMMUTABLE_FIELDS) delete patch[field];

    return await withDb(async () => {
      const existing = await DeploymentModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const deployment = existing as unknown as Deployment;

      if (
        typeof patch.domain === "string" &&
        patch.domain.toLowerCase() !== deployment.domain
      ) {
        const zoneStep = deployment.steps.find((s) => s.key === "cloudflare_zone");
        const zoneLocked = zoneStep?.status === "done" || zoneStep?.status === "adopted";
        const isAdmin = actor.roleKeys.includes("crm.admin");
        if (zoneLocked && !(isAdmin && patch.force === true)) {
          return NextResponse.json(
            {
              error:
                "A domain nem módosítható, amíg a cloudflare_zone lépés kész — admin force szükséges.",
              code: "DOMAIN_LOCKED",
            },
            { status: 409 },
          );
        }
        patch.domain = patch.domain.toLowerCase();
      }
      delete patch.force;

      const doc = await DeploymentModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: patch },
        { new: true },
      ).lean();
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "admin", scope: "global" });
    const { searchParams } = new URL(req.url);
    const hard = searchParams.get("hard") === "1";

    return await withDb(async () => {
      const existing = await DeploymentModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const deployment = existing as unknown as Deployment;

      if (hard) {
        if (hasAnyExternalId(deployment)) {
          return NextResponse.json(
            {
              error:
                "Nem törölhető véglegesen, amíg külső erőforrások vannak hozzárendelve.",
              code: "HAS_EXTERNAL_RESOURCES",
            },
            { status: 409 },
          );
        }
        await DeploymentModel.deleteOne({ _id: id, tenantId: actor.tenantId });
        return NextResponse.json({ ok: true });
      }

      const doc = await DeploymentModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        {
          $set: {
            status: "archived",
            archived_at: new Date(),
            archive_reason: "Archiválva a CRM-ből.",
          },
        },
        { new: true },
      ).lean();
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
