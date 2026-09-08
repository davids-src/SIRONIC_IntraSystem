import { NextResponse } from "next/server";
import { z } from "zod";
import { ContactModel, OfferModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { grossTotalFromLines, offerLineSchema } from "../schema";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "offer", action: "view", scope: "global" });
    const { id } = await ctx.params;
    return await withDb(async () => {
      const doc = await OfferModel.findOne({ _id: id, tenantId: actor.tenantId }).lean();
      if (!doc) {
        return NextResponse.json({ error: "Offer not found" }, { status: 404 });
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  contact_id: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
  status: z.enum(["draft", "ready", "sent", "accepted", "rejected"]).optional(),
  valid_until: z.coerce.date().nullable().optional(),
  lines: z.array(offerLineSchema).optional(),
  notes: z.string().nullable().optional(),
  is_archived: z.boolean().optional(),
  archived_at: z.coerce.date().nullable().optional(),
  archive_reason: z.string().nullable().optional(),
});

// Az árlista-tartalmat (cím, tételsorok, stb.) csak piszkozat (draft)
// állapotban lehet módosítani – kiküldés után az ajánlat tartalma zárolt,
// lásd SIRONIC_SYSTEM_MANUAL.md. Az archiválás és a státusz-váltás (pl.
// portál elfogadás/elutasítás, admin visszavonás) ettől függetlenül mindig
// engedélyezett.
const CONTENT_ONLY_FIELDS = [
  "title",
  "contact_id",
  "currency",
  "valid_until",
  "lines",
  "notes",
] as const;

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "offer", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const patch: Record<string, unknown> = { ...parsed.data };

    return await withDb(async () => {
      const existing = await OfferModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!existing) {
        return NextResponse.json({ error: "Offer not found" }, { status: 404 });
      }

      if ((existing as any).status !== "draft") {
        for (const field of CONTENT_ONLY_FIELDS) {
          delete patch[field];
        }
      }

      if (typeof patch.contact_id === "string") {
        const contact = await ContactModel.findOne({
          _id: patch.contact_id,
          tenantId: actor.tenantId,
        }).lean();
        if (!contact) {
          return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }
      }

      // Recalculate total_amount whenever lines are present in the patch
      if (Array.isArray(patch.lines) && patch.lines.length > 0) {
        patch.total_amount = Math.round(
          grossTotalFromLines(patch.lines as Parameters<typeof grossTotalFromLines>[0]),
        );
      }

      const doc = await OfferModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: patch },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) {
        return NextResponse.json({ error: "Offer not found" }, { status: 404 });
      }
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
    guard(actor, { module: "offer", action: "admin", scope: "global" });
    const { searchParams } = new URL(req.url);
    const reason = searchParams.get("reason")?.trim() || "Törölve";
    return await withDb(async () => {
      // Soft delete: set is_archived to true
      const doc = await OfferModel.findOneAndUpdate(
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
        return NextResponse.json({ error: "Offer not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
