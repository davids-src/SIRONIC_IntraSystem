import { NextResponse } from "next/server";
import { OfferModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

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

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "offer", action: "write", scope: "global" });
    const patch: Record<string, unknown> = await req.json();
    delete patch._id;
    delete patch.tenantId;
    delete patch.offer_number;
    return await withDb(async () => {
      const doc = await OfferModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: patch },
        { new: true },
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
