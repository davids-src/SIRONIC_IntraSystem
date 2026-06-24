import { NextResponse } from "next/server";
import { z } from "zod";
import {
  InventoryTakingModel,
  StockItemModel,
  StockTransactionModel,
  PriceListItemModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const inventoryTakingItemSchema = z.object({
  price_list_item_id: z.string().min(1),
  expected_qty: z.number().nonnegative(),
  physical_qty: z.number().nonnegative(),
  diff_qty: z.number(),
  notes: z.string().nullable().optional(),
});

const createInventoryTakingSchema = z.object({
  warehouse_location: z.string().min(1),
  status: z.enum(["draft", "completed"]).default("draft"),
  items: z.array(inventoryTakingItemSchema),
});

/**
 * GET /api/warehouse/inventory-taking
 * Leltárak listázása. Ha van location paraméter, akkor a jelenleg elvárt készletet adja vissza a leltárhoz.
 */
export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "view", scope: "global" });

    const { searchParams } = new URL(req.url);
    const location = searchParams.get("location")?.trim();

    return await withDb(async () => {
      if (location) {
        // Generáljunk egy leltár tervezetet (expected stock) a megadott helyen lévő cikkekből
        const stockItems = await StockItemModel.find({
          tenantId: actor.tenantId,
          warehouse_location: location,
        }).lean();

        // Enrich with product data
        const priceListIds = stockItems.map((s) => s.price_list_item_id);
        const products = await PriceListItemModel.find({
          tenantId: actor.tenantId,
          _id: { $in: priceListIds },
        }).lean();
        const productMap = new Map(products.map((p) => [String(p._id), p]));

        const items = stockItems.map((s) => ({
          price_list_item_id: s.price_list_item_id,
          product_name: productMap.get(s.price_list_item_id)?.name ?? "Ismeretlen cikk",
          product_number: productMap.get(s.price_list_item_id)?.item_number ?? "",
          unit: productMap.get(s.price_list_item_id)?.unit ?? "db",
          expected_qty: s.quantity_in_stock,
          physical_qty: s.quantity_in_stock, // Alapértelmezetten a fizikai egyezik az elvárttal, a felhasználó ezt szerkeszti
          diff_qty: 0,
          serial_numbers: s.serial_numbers || [],
          notes: "",
        }));

        return NextResponse.json(serializeForJson(items));
      }

      // Különben listázzuk a korábbi leltárakat
      const audits = await InventoryTakingModel.find({ tenantId: actor.tenantId })
        .sort({ created_at: -1 })
        .lean();
      return NextResponse.json(serializeForJson(audits));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * POST /api/warehouse/inventory-taking
 * Új leltár ív rögzítése (és opcionálisan azonnali lezárása).
 */
export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "write", scope: "global" });

    const json = await req.json();
    const parsed = createInventoryTakingSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    return await withDb(async () => {
      const isCompleted = b.status === "completed";
      const completedAt = isCompleted ? new Date() : null;

      // 1. Create InventoryTaking audit record
      const doc = await InventoryTakingModel.create({
        tenantId: actor.tenantId,
        warehouse_location: b.warehouse_location,
        status: b.status,
        created_by: actor.actorId,
        items: b.items.map((item) => ({
          price_list_item_id: item.price_list_item_id,
          expected_qty: item.expected_qty,
          physical_qty: item.physical_qty,
          diff_qty: item.diff_qty,
          notes: item.notes || null,
        })),
        completed_at: completedAt,
      });

      // 2. If completed, apply adjustments to StockItem and log StockTransaction
      if (isCompleted) {
        for (const item of b.items) {
          const existingStock = await StockItemModel.findOne({
            tenantId: actor.tenantId,
            price_list_item_id: item.price_list_item_id,
            warehouse_location: b.warehouse_location,
          });

          const existingQty = existingStock ? existingStock.quantity_in_stock : 0;
          const diff = item.physical_qty - existingQty;

          // Adjust or Create StockItem
          await StockItemModel.findOneAndUpdate(
            {
              tenantId: actor.tenantId,
              price_list_item_id: item.price_list_item_id,
              warehouse_location: b.warehouse_location,
            },
            {
              $set: { quantity_in_stock: item.physical_qty },
              $setOnInsert: {
                tenantId: actor.tenantId,
                price_list_item_id: item.price_list_item_id,
                warehouse_location: b.warehouse_location,
                quantity_allocated: 0,
                low_stock_threshold: null,
                notes: `Leltározás során felvéve`,
                serial_numbers: [],
              },
            },
            { upsert: true },
          );

          // Log transaction
          if (diff !== 0) {
            await StockTransactionModel.create({
              tenantId: actor.tenantId,
              price_list_item_id: item.price_list_item_id,
              type: "adjustment",
              quantity: diff,
              serial_numbers: [],
              reference_type: "manual",
              reference_id: String(doc._id),
              notes:
                item.notes ||
                `Leltári korrekció (${b.warehouse_location}): ${existingQty} → ${item.physical_qty}`,
              created_by: actor.actorId,
            });
          }
        }
      }

      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
