import { NextResponse } from "next/server";
import { SecretModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "secret", action: "view", scope: "global" });
    return await withDb(async () => {
      const doc = await SecretModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      })
        .lean()
        .select("-encrypted_value");
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * PATCH /api/secrets/[id]
 * Titok metadatájának módosítása (key, visibility) VAGY érték frissítése.
 * Ha a body tartalmaz "value" mezőt, az újratitkosítva lesz tárolva.
 */
export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "secret", action: "write", scope: "global" });
    const body: Record<string, unknown> = await req.json();
    return await withDb(async () => {
      const patch: Record<string, unknown> = {};
      if (typeof body.key === "string" && body.key.trim()) {
        patch.key = body.key.trim();
      }
      if (body.visibility === "shared" || body.visibility === "private") {
        patch.visibility = body.visibility;
      }
      if (typeof body.value === "string") {
        patch.encrypted_value = encryptSecret(body.value);
      }
      if (typeof body.project_id !== "undefined") {
        patch.project_id = body.project_id ?? null;
      }
      if (typeof body.contact_id !== "undefined") {
        patch.contact_id = body.contact_id ?? null;
      }
      const doc = await SecretModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: patch },
        { new: true },
      )
        .lean()
        .select("-encrypted_value");
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "secret", action: "admin", scope: "global" });
    return await withDb(async () => {
      const res = await SecretModel.deleteOne({ _id: id, tenantId: actor.tenantId });
      if (res.deletedCount === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
