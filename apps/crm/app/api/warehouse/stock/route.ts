import { NextResponse } from "next/server";
import { z } from "zod";
import {
  PriceListItemModel,
  StockItemModel,
  StockTransactionModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const addStockSchema = z.object({
  price_list_item_id: z.string().min(1),
  quantity: z.number().positive(),
  warehouse_location: z.string().nullable().optional(),
  low_stock_threshold: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * GET /api/warehouse/stock
 * Visszaadja az összes raktáron lévő tételt az árlistaelem adataival együtt.
 */
export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const locationFilter = searchParams.get("location")?.trim();

    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (locationFilter) filter.warehouse_location = locationFilter;

      const stockItems = await StockItemModel.find(filter)
        .sort({ updated_at: -1 })
        .lean();

      // Enrich with price list item data
      const priceListIds = stockItems.map((s) => s.price_list_item_id);
      const products = await PriceListItemModel.find({
        tenantId: actor.tenantId,
        _id: { $in: priceListIds },
      }).lean();
      const productMap = new Map(products.map((p) => [String(p._id), p]));

      const enriched = stockItems.map((s) => ({
        ...s,
        product: productMap.get(s.price_list_item_id) ?? null,
      }));

      return NextResponse.json(serializeForJson(enriched));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * POST /api/warehouse/stock
 * Manuális bevét: új tétel felvétele vagy meglévő növelése.
 */
export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "write", scope: "global" });

    const json: unknown = await req.json();
    const parsed = addStockSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    return await withDb(async () => {
      // Verify the price list item belongs to this tenant
      const product = await PriceListItemModel.findOne({
        _id: b.price_list_item_id,
        tenantId: actor.tenantId,
      }).lean();
      if (!product) {
        return NextResponse.json(
          { error: "Árlistaelem nem található." },
          { status: 400 },
        );
      }

      // Upsert stock item
      const stockItem = await StockItemModel.findOneAndUpdate(
        { tenantId: actor.tenantId, price_list_item_id: b.price_list_item_id },
        {
          $inc: { quantity_in_stock: b.quantity },
          $set: {
            ...(b.warehouse_location !== undefined && {
              warehouse_location: b.warehouse_location,
            }),
            ...(b.low_stock_threshold !== undefined && {
              low_stock_threshold: b.low_stock_threshold,
            }),
            ...(b.notes !== undefined && { notes: b.notes }),
          },
          $setOnInsert: {
            tenantId: actor.tenantId,
            price_list_item_id: b.price_list_item_id,
          },
        },
        { upsert: true, new: true },
      ).lean();

      // Log transaction
      await StockTransactionModel.create({
        tenantId: actor.tenantId,
        price_list_item_id: b.price_list_item_id,
        type: "in",
        quantity: b.quantity,
        reference_type: "manual",
        reference_id: null,
        notes: b.notes ?? null,
        created_by: actor.actorId,
      });

      return NextResponse.json(serializeForJson(stockItem), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
