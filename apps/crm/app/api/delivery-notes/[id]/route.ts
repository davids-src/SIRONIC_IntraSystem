import { NextResponse } from "next/server";
import {
  DeliveryNoteModel,
  StockItemModel,
  StockTransactionModel,
  PriceListItemModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "delivery_note", action: "view", scope: "global" });
    return await withDb(async () => {
      const doc = await DeliveryNoteModel.findOne({
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
    guard(actor, { module: "delivery_note", action: "write", scope: "global" });
    const patch: Record<string, unknown> = await req.json();
    const prevStatus = patch._prevStatus as string | undefined;
    const nextStatus = patch.status as string | undefined;
    delete patch._id;
    delete patch.tenantId;
    delete patch.delivery_number;
    delete patch._prevStatus;
    return await withDb(async () => {
      const existing = await DeliveryNoteModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (
        (existing as any).status === "cancelled" &&
        !patch.is_archived &&
        patch.is_archived !== false
      ) {
        return NextResponse.json(
          { error: "Már törölt szállítólevél nem módosítható." },
          { status: 400 },
        );
      }
      // Only allow line edits on drafts
      if ((existing as any).status !== "draft" && patch.lines) {
        delete patch.lines;
      }
      const doc = await DeliveryNoteModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: patch },
        { new: true },
      ).lean();
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const docAny = doc as any;
      // draft -> issued: levon a raktárból
      if (
        nextStatus === "issued" &&
        (prevStatus ?? (existing as any).status) === "draft"
      ) {
        for (const line of docAny.lines ?? []) {
          try {
            const item = await PriceListItemModel.findOne({
              _id: line.price_list_item_id,
              tenantId: actor.tenantId,
            }).lean();
            if (item && item.type !== "product") {
              continue;
            }

            await StockItemModel.findOneAndUpdate(
              { tenantId: actor.tenantId, price_list_item_id: line.price_list_item_id },
              { $inc: { quantity_in_stock: -line.quantity } },
              { upsert: true },
            );
            await StockTransactionModel.create({
              tenantId: actor.tenantId,
              price_list_item_id: line.price_list_item_id,
              type: "out",
              quantity: line.quantity,
              reference_type: "manual",
              reference_id: String(docAny._id),
              notes: `Szállítólevél kiadva: ${docAny.delivery_number}`,
              created_by: actor.actorId ?? "system",
            });
          } catch {
            /* non-fatal */
          }
        }
      }
      // issued -> cancelled: visszavételez
      if (
        nextStatus === "cancelled" &&
        (prevStatus ?? (existing as any).status) === "issued"
      ) {
        for (const line of docAny.lines ?? []) {
          try {
            const item = await PriceListItemModel.findOne({
              _id: line.price_list_item_id,
              tenantId: actor.tenantId,
            }).lean();
            if (item && item.type !== "product") {
              continue;
            }

            await StockItemModel.findOneAndUpdate(
              { tenantId: actor.tenantId, price_list_item_id: line.price_list_item_id },
              { $inc: { quantity_in_stock: line.quantity } },
              { upsert: true },
            );
            await StockTransactionModel.create({
              tenantId: actor.tenantId,
              price_list_item_id: line.price_list_item_id,
              type: "in",
              quantity: line.quantity,
              reference_type: "manual",
              reference_id: String(docAny._id),
              notes: `Szállítólevél stornózva: ${docAny.delivery_number}`,
              created_by: actor.actorId ?? "system",
            });
          } catch {
            /* non-fatal */
          }
        }
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
    guard(actor, { module: "delivery_note", action: "admin", scope: "global" });
    const url = new URL(req.url);
    const reason = url.searchParams.get("reason") || "Törölve";
    return await withDb(async () => {
      const existing = await DeliveryNoteModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if ((existing as any).status === "issued") {
        return NextResponse.json(
          { error: "Kiadott szállítólevél nem törölhető. Sztornózd először." },
          { status: 400 },
        );
      }
      await DeliveryNoteModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: { is_archived: true, archived_at: new Date(), archive_reason: reason } },
      );
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
