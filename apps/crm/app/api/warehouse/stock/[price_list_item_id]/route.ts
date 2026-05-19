import { NextResponse } from "next/server";
import { z } from "zod";
import {
  PriceListItemModel,
  StockItemModel,
  StockTransactionModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ price_list_item_id: string }> };

const patchSchema = z.object({
  warehouse_location: z.string().nullable().optional(),
  low_stock_threshold: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const adjustSchema = z.object({
  new_quantity: z.number().min(0),
  notes: z.string().nullable().optional(),
});

/**
 * PATCH /api/warehouse/stock/[price_list_item_id]
 * Raktárkészlet metaadatainak módosítása (hely, küszöb, megjegyzés).
 */
export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { price_list_item_id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "write", scope: "global" });

    const json: unknown = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    return await withDb(async () => {
      const doc = await StockItemModel.findOneAndUpdate(
        { tenantId: actor.tenantId, price_list_item_id },
        {
          $set: {
            ...(b.warehouse_location !== undefined && {
              warehouse_location: b.warehouse_location,
            }),
            ...(b.low_stock_threshold !== undefined && {
              low_stock_threshold: b.low_stock_threshold,
            }),
            ...(b.notes !== undefined && { notes: b.notes }),
          },
        },
        { new: true },
      ).lean();
      if (!doc) {
        return NextResponse.json({ error: "Nem található." }, { status: 404 });
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * DELETE /api/warehouse/stock/[price_list_item_id]
 * Törli a raktárkészlet tételt (nullázza az árlistaelemet a raktárból).
 */
export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const { price_list_item_id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "admin", scope: "global" });

    return await withDb(async () => {
      const res = await StockItemModel.deleteOne({
        tenantId: actor.tenantId,
        price_list_item_id,
      });
      if (res.deletedCount === 0) {
        return NextResponse.json({ error: "Nem található." }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
