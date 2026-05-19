import { NextResponse } from "next/server";
import {
  WorklogModel,
  StockItemModel,
  StockTransactionModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "worklog", action: "finalize", scope: "global" });
    return await withDb(async () => {
      const doc = await WorklogModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId, status: "draft" },
        { $set: { status: "finalized" } },
        { new: true },
      ).lean();
      if (!doc) {
        return NextResponse.json(
          { error: "Not found or already finalized" },
          { status: 404 },
        );
      }

      // ── Raktár levonás ────────────────────────────────────────────────────
      // Minden tételnél ahol price_list_item_id van, levonjuk a készletből.
      // Hiány esetén NEM blokkoljuk a véglegesítést, csak logoljuk.
      const linkedItems = doc.items.filter(
        (it) => it.price_list_item_id && it.quantity > 0,
      );
      for (const item of linkedItems) {
        try {
          const stockItem = await StockItemModel.findOne({
            tenantId: actor.tenantId,
            price_list_item_id: item.price_list_item_id,
          }).lean();

          if (!stockItem) continue; // Nincs raktáron nyilvántartva, kihagyjuk

          const deduct = Math.min(item.quantity, stockItem.quantity_in_stock);
          if (deduct <= 0) continue;

          await StockItemModel.findOneAndUpdate(
            { tenantId: actor.tenantId, price_list_item_id: item.price_list_item_id },
            { $inc: { quantity_in_stock: -deduct } },
          );

          await StockTransactionModel.create({
            tenantId: actor.tenantId,
            price_list_item_id: item.price_list_item_id,
            type: "out",
            quantity: deduct,
            reference_type: "worklog",
            reference_id: String(doc._id),
            notes: `Munkalap: ${doc.worklog_number} – ${item.description}`,
            created_by: actor.actorId ?? "system",
          });
        } catch {
          // Ne blokkolja a véglegesítést
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
