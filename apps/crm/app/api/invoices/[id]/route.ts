import { NextResponse } from "next/server";
import { z } from "zod";
import { InvoiceModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  contact_id: z.string().min(1).optional(),
  title: z.string().nullable().optional(),
  total_amount: z.number().min(0).optional(),
  currency: z.string().min(1).optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
  issued_at: z.coerce.date().nullable().optional(),
  due_at: z.coerce.date().nullable().optional(),
  is_archived: z.boolean().optional(),
  archived_at: z.coerce.date().nullable().optional(),
  archive_reason: z.string().nullable().optional(),
});

// A számla tartalma (partner, cím, összeg, dátumok) csak piszkozat (draft)
// állapotban módosítható – lásd SIRONIC_SYSTEM_MANUAL.md "kiküldés után
// zárolás" szabálya. A státusz-váltás (pl. kiküldés, befizetés jelölése)
// és az archiválás ettől függetlenül mindig engedélyezett.
const CONTENT_ONLY_FIELDS = [
  "contact_id",
  "title",
  "total_amount",
  "currency",
  "issued_at",
  "due_at",
] as const;

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "invoice", action: "view", scope: "global" });
    return await withDb(async () => {
      const doc = await InvoiceModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
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
    guard(actor, { module: "invoice", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const patch: Record<string, unknown> = { ...parsed.data };

    return await withDb(async () => {
      const existing = await InvoiceModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if ((existing as any).status !== "draft") {
        for (const field of CONTENT_ONLY_FIELDS) {
          delete patch[field];
        }
      }

      const doc = await InvoiceModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: patch },
        { new: true, runValidators: true },
      ).lean();
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
    guard(actor, { module: "invoice", action: "admin", scope: "global" });
    return await withDb(async () => {
      const res = await InvoiceModel.deleteOne({ _id: id, tenantId: actor.tenantId });
      if (res.deletedCount === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
