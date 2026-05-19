import { NextResponse } from "next/server";
import { z } from "zod";
import { StockItemModel, StockTransactionModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ price_list_item_id: string }> };

const adjustSchema = z.object({
  new_quantity: z.number().min(0),
  notes: z.string().nullable().optional(),
});

/**
 * POST /api/warehouse/stock/[price_list_item_id]/adjust
 * Leltári korrekció – a készletet egy konkrét értékre állítja.
 */
export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const { price_list_item_id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "write", scope: "global" });

    const json: unknown = await req.json();
    const parsed = adjustSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { new_quantity, notes } = parsed.data;

    return await withDb(async () => {
      const existing = await StockItemModel.findOne({
        tenantId: actor.tenantId,
        price_list_item_id,
      }).lean();
      if (!existing) {
        return NextResponse.json({ error: "Nem található." }, { status: 404 });
      }

      const diff = new_quantity - existing.quantity_in_stock;

      const doc = await StockItemModel.findOneAndUpdate(
        { tenantId: actor.tenantId, price_list_item_id },
        { $set: { quantity_in_stock: new_quantity } },
        { new: true },
      ).lean();

      // Log adjustment transaction
      await StockTransactionModel.create({
        tenantId: actor.tenantId,
        price_list_item_id,
        type: "adjustment",
        quantity: diff,
        reference_type: "manual",
        reference_id: null,
        notes:
          notes ?? `Leltári korrekció: ${existing.quantity_in_stock} → ${new_quantity}`,
        created_by: actor.actorId,
      });

      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
