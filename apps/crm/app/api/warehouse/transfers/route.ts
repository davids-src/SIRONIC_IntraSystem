import { NextResponse } from "next/server";
import { z } from "zod";
import { StockItemModel, StockTransactionModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const transferSchema = z.object({
  price_list_item_id: z.string().min(1),
  from_location: z.string().min(1),
  to_location: z.string().min(1),
  quantity: z.number().positive(),
  serial_numbers: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
});

/**
 * POST /api/warehouse/transfers
 * Raktárközi átmozgatás végrehajtása.
 */
export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "write", scope: "global" });

    const json = await req.json();
    const parsed = transferSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    if (b.from_location === b.to_location) {
      return NextResponse.json(
        { error: "A forrás és cél raktárhely nem egyezhet meg!" },
        { status: 400 },
      );
    }

    return await withDb(async () => {
      // 1. Check source stock
      const sourceStock = await StockItemModel.findOne({
        tenantId: actor.tenantId,
        price_list_item_id: b.price_list_item_id,
        warehouse_location: b.from_location,
      });

      if (!sourceStock || sourceStock.quantity_in_stock < b.quantity) {
        return NextResponse.json(
          { error: "Nincs elegendő készlet a forrás raktárhelyen!" },
          { status: 400 },
        );
      }

      // Check serial numbers if provided
      const serialsToMove = b.serial_numbers || [];
      if (serialsToMove.length > 0) {
        // Ensure all exist in sourceStock
        const missingSerials = serialsToMove.filter(
          (sn) => !sourceStock.serial_numbers.includes(sn),
        );
        if (missingSerials.length > 0) {
          return NextResponse.json(
            {
              error: `Néhány szériaszám nem található a forráshelyen: ${missingSerials.join(", ")}`,
            },
            { status: 400 },
          );
        }
      }

      // 2. Deduct from source
      await StockItemModel.updateOne(
        { _id: sourceStock._id },
        {
          $inc: { quantity_in_stock: -b.quantity },
          ...(serialsToMove.length > 0 && {
            $pull: { serial_numbers: { $in: serialsToMove } },
          }),
        },
      );

      // 3. Add to destination (upsert)
      await StockItemModel.findOneAndUpdate(
        {
          tenantId: actor.tenantId,
          price_list_item_id: b.price_list_item_id,
          warehouse_location: b.to_location,
        },
        {
          $inc: { quantity_in_stock: b.quantity },
          $addToSet: { serial_numbers: { $each: serialsToMove } },
          $setOnInsert: {
            tenantId: actor.tenantId,
            price_list_item_id: b.price_list_item_id,
            warehouse_location: b.to_location,
            quantity_allocated: 0,
            low_stock_threshold: null,
            notes: null,
          },
        },
        { upsert: true },
      );

      // 4. Log transfer transaction
      const transaction = await StockTransactionModel.create({
        tenantId: actor.tenantId,
        price_list_item_id: b.price_list_item_id,
        type: "transfer",
        quantity: b.quantity,
        serial_numbers: serialsToMove,
        to_warehouse_location: b.to_location,
        reference_type: "manual",
        reference_id: null,
        notes: b.notes || `Átmozgatás: ${b.from_location} → ${b.to_location}`,
        created_by: actor.actorId,
      });

      return NextResponse.json(serializeForJson(transaction.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
