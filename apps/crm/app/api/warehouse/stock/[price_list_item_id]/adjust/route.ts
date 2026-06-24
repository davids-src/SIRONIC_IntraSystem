import { NextResponse } from "next/server";
import { z } from "zod";
import { StockItemModel, StockTransactionModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ price_list_item_id: string }> };

const adjustSchema = z.object({
  new_quantity: z.number().min(0),
  notes: z.string().nullable().optional(),
  serial_numbers: z.array(z.string()).optional(),
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
    const { new_quantity, notes, serial_numbers } = parsed.data;

    return await withDb(async () => {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(price_list_item_id);
      const query = isObjectId
        ? { tenantId: actor.tenantId, _id: price_list_item_id }
        : { tenantId: actor.tenantId, price_list_item_id };

      const existing = (await StockItemModel.findOne(query).lean()) as any;
      if (!existing) {
        return NextResponse.json({ error: "Nem található." }, { status: 404 });
      }

      const finalQty =
        serial_numbers && serial_numbers.length > 0
          ? serial_numbers.length
          : new_quantity;
      const diff = finalQty - existing.quantity_in_stock;

      const doc = (await StockItemModel.findOneAndUpdate(
        query,
        {
          $set: {
            quantity_in_stock: finalQty,
            ...(serial_numbers !== undefined && { serial_numbers }),
          },
        },
        { new: true },
      ).lean()) as any;

      // Log adjustment transaction
      await StockTransactionModel.create({
        tenantId: actor.tenantId,
        price_list_item_id: existing.price_list_item_id,
        type: "adjustment",
        quantity: diff,
        serial_numbers: serial_numbers || [],
        reference_type: "manual",
        reference_id: null,
        notes: notes ?? `Leltári korrekció: ${existing.quantity_in_stock} → ${finalQty}`,
        created_by: actor.actorId,
      });

      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
