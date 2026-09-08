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
      // draft -> issued: készletellenőrzés és levonás
      // A státuszváltás forrása mindig a DB-ben ténylegesen tárolt előző
      // állapot (existing.status), SOHA a kliens által küldött érték – egy
      // meghamisított/replay-elt kérés így nem tud dupla készletlevonást
      // vagy levonás nélküli "issued" állapotot előidézni.
      if (nextStatus === "issued" && (existing as any).status === "draft") {
        const lines = docAny.lines ?? [];

        // 1. fázis: minden sor ellenőrzése, mielőtt bármelyiket levonnánk –
        // így egy köztes sikertelen ellenőrzés nem hagy részlegesen levont készletet.
        const productLines: typeof lines = [];
        const neededByItem = new Map<string, number>();
        for (const line of lines) {
          const item = await PriceListItemModel.findOne({
            _id: line.price_list_item_id,
            tenantId: actor.tenantId,
          }).lean();
          if (item && (item as any).type !== "product") {
            continue;
          }
          productLines.push(line);
          neededByItem.set(
            line.price_list_item_id,
            (neededByItem.get(line.price_list_item_id) ?? 0) + line.quantity,
          );
        }

        for (const [priceListItemId, needed] of neededByItem) {
          const stockItem = (await StockItemModel.findOne({
            tenantId: actor.tenantId,
            price_list_item_id: priceListItemId,
          }).lean()) as any;

          if (stockItem && stockItem.quantity_in_stock < needed) {
            // Rollback: státusz visszaállítása draft-ra – még semmit nem vontunk le
            await DeliveryNoteModel.findOneAndUpdate(
              { _id: id, tenantId: actor.tenantId },
              { $set: { status: "draft" } },
            );
            const line = productLines.find(
              (l: any) => l.price_list_item_id === priceListItemId,
            );
            return NextResponse.json(
              {
                error: `Nincs elég készlet: "${line?.name ?? priceListItemId}" – kért: ${needed}, elérhető: ${stockItem.quantity_in_stock}`,
              },
              { status: 400 },
            );
          }
        }

        // 2. fázis: minden sor rendben – tényleges levonás
        try {
          for (const line of productLines) {
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
              reference_type: "delivery_note",
              reference_id: String(docAny._id),
              notes: `Szállítólevél kiadva: ${docAny.delivery_number}`,
              created_by: actor.actorId ?? "system",
            });
          }
        } catch (err) {
          console.error(
            `[delivery-notes] Stock deduction failed mid-way for ${docAny.delivery_number}`,
            err,
          );
          throw err;
        }
      }
      // issued -> cancelled: visszavételez
      if (nextStatus === "cancelled" && (existing as any).status === "issued") {
        for (const line of docAny.lines ?? []) {
          try {
            const item = await PriceListItemModel.findOne({
              _id: line.price_list_item_id,
              tenantId: actor.tenantId,
            }).lean();
            if (item && (item as any).type !== "product") {
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
              reference_type: "delivery_note",
              reference_id: String(docAny._id),
              notes: `Szállítólevél stornózva: ${docAny.delivery_number}`,
              created_by: actor.actorId ?? "system",
            });
          } catch (err) {
            console.error(
              `[delivery-notes] Stock reversal failed for line ${line.price_list_item_id} on ${docAny.delivery_number}`,
              err,
            );
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
