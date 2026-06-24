import { NextResponse } from "next/server";
import { z } from "zod";
import { WarrantyCardModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const patchSchema = z.object({
  status: z.enum(["active", "expired", "claimed", "void"]).optional(),
  notes: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  is_archived: z.boolean().optional(),
  archive_reason: z.string().nullable().optional(),
});

/**
 * GET /api/warranties/:id
 * Egy jótállási jegy részletei
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "warranty", action: "view", scope: "global" });
    const { id } = await params;

    return await withDb(async () => {
      const doc = await WarrantyCardModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!doc) {
        return NextResponse.json({ error: "Nem található" }, { status: 404 });
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * PATCH /api/warranties/:id
 * Státusz vagy megjegyzés frissítése
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "warranty", action: "write", scope: "global" });
    const { id } = await params;

    const json: unknown = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    return await withDb(async () => {
      const doc = await WarrantyCardModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: parsed.data },
        { new: true },
      ).lean();
      if (!doc) {
        return NextResponse.json({ error: "Nem található" }, { status: 404 });
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * DELETE /api/warranties/:id
 * Archiválás (soft-delete)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "warranty", action: "admin", scope: "global" });
    const { id } = await params;
    const url = new URL(req.url);
    const reason = url.searchParams.get("reason") || "Archiválva";

    return await withDb(async () => {
      const doc = await WarrantyCardModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        {
          $set: {
            is_archived: true,
            archived_at: new Date(),
            archive_reason: reason,
          },
        },
        { new: true },
      ).lean();
      if (!doc) {
        return NextResponse.json({ error: "Nem található" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
