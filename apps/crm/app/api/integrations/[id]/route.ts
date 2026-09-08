import { NextResponse } from "next/server";
import { z } from "zod";
import { IntegrationConnectionModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { encryptSecret } from "@/lib/secret-crypto";

type RouteCtx = { params: Promise<{ id: string }> };

function omitSecrets(doc: Record<string, unknown>) {
  const { encrypted_credentials, ...rest } = doc;
  void encrypted_credentials;
  return { ...rest, has_credentials: true };
}

const patchSchema = z.object({
  label: z.string().min(1).optional(),
  base_url: z.string().url().optional(),
  credentials: z.record(z.string(), z.string()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "integration", action: "admin", scope: "global" });
    const json: unknown = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { credentials, ...rest } = parsed.data;
    const set: Record<string, unknown> = { ...rest };
    if (credentials)
      set.encrypted_credentials = encryptSecret(JSON.stringify(credentials));

    return await withDb(async () => {
      const doc = await IntegrationConnectionModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: set },
        { new: true },
      ).lean();
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(
        serializeForJson(omitSecrets(doc as Record<string, unknown>)),
      );
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "integration", action: "admin", scope: "global" });
    return await withDb(async () => {
      const res = await IntegrationConnectionModel.deleteOne({
        _id: id,
        tenantId: actor.tenantId,
      });
      if (res.deletedCount === 0)
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
