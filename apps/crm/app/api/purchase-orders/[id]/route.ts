import { NextResponse } from "next/server";
import { z } from "zod";
import {
  PurchaseOrderModel,
  StockItemModel,
  StockTransactionModel,
  PriceListItemModel,
  SettingsModel,
  SupplierModel,
  nextCounterValue,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const updateSchema = z.object({
  status: z.enum(["draft", "sent", "fulfilled", "cancelled"]).optional(),
  expected_delivery_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_archived: z.boolean().optional(),
  archived_at: z.any().optional(),
  archive_reason: z.string().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "settings", action: "view", scope: "global" });
    const { id } = await params;
    return await withDb(async () => {
      const doc = await PurchaseOrderModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "settings", action: "write", scope: "global" });
    const { id } = await params;
    const json: unknown = await req.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    return await withDb(async () => {
      const existing = (await PurchaseOrderModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean()) as any;
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const update: Record<string, unknown> = { ...parsed.data };
      if (parsed.data.expected_delivery_date) {
        update.expected_delivery_date = new Date(parsed.data.expected_delivery_date);
      }
      const doc = (await PurchaseOrderModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: update },
        { new: true },
      ).lean()) as any;
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

      // ── Raktár bevételezés ────────────────────────────────────────────────
      // Ha most lett "fulfilled", bevételezzük a tételeket.
      if (parsed.data.status === "fulfilled" && existing.status !== "fulfilled") {
        const updatedLines = [];
        const settings = await SettingsModel.findOne({ tenantId: actor.tenantId }).lean();
        let prefix = "PL";
        let categoryId = "product";
        if (
          (settings as any)?.item_categories &&
          (settings as any).item_categories.length > 0
        ) {
          const cat = (settings as any).item_categories[0];
          prefix = cat.prefix || "PL";
          categoryId = cat.id || "product";
        }

        let supplierName = "Beszállító";
        if (doc.supplier_id) {
          const supplier = await SupplierModel.findOne({
            _id: doc.supplier_id,
            tenantId: actor.tenantId,
          }).lean();
          if (supplier) {
            supplierName = (supplier as any).name as string;
          }
        }

        for (const line of doc.lines) {
          if (line.quantity <= 0) {
            updatedLines.push(line);
            continue;
          }

          let itemId = line.price_list_item_id;
          if (!itemId) {
            // Create a new PriceListItem
            try {
              const n = await nextCounterValue(actor.tenantId, `price_list_${prefix}`);
              const item_number = `${prefix}${String(n).padStart(6, "0")}`;
              const newItem = await PriceListItemModel.create({
                tenantId: actor.tenantId,
                item_number,
                type: "product",
                name: line.description,
                description: null,
                category: categoryId,
                unit: line.unit || "db",
                net_price: 0,
                currency: "HUF",
                tax_rate: line.tax_rate ?? 27,
                is_active: true,
                notes: `Automatikusan létrehozva a ${doc.order_number} megrendelőlap teljesítésekor`,
                purchase_records: [
                  {
                    supplier_name: supplierName,
                    supplier_item_number: null,
                    net_purchase_price: line.net_unit_price,
                    purchased_at: new Date(),
                    notes: `Megrendelőlap: ${doc.order_number}`,
                  },
                ],
                last_purchase_price: line.net_unit_price,
                preferred_supplier: supplierName,
              });
              itemId = String(newItem._id);
              line.price_list_item_id = itemId;
            } catch (err) {
              console.error("Hiba az árlistaelem automatikus létrehozásakor:", err);
            }
          } else {
            // Add a purchase record to the existing price list item as well!
            try {
              await PriceListItemModel.updateOne(
                { _id: itemId, tenantId: actor.tenantId },
                {
                  $set: {
                    last_purchase_price: line.net_unit_price,
                    preferred_supplier: supplierName,
                  },
                  $push: {
                    purchase_records: {
                      supplier_name: supplierName,
                      supplier_item_number: null,
                      net_purchase_price: line.net_unit_price,
                      purchased_at: new Date(),
                      notes: `Megrendelőlap: ${doc.order_number}`,
                    },
                  },
                },
              );
            } catch (err) {
              console.error("Hiba a beszerzési árak frissítésekor:", err);
            }
          }

          if (itemId) {
            try {
              await StockItemModel.findOneAndUpdate(
                { tenantId: actor.tenantId, price_list_item_id: itemId },
                { $inc: { quantity_in_stock: line.quantity } },
                { upsert: true },
              );

              await StockTransactionModel.create({
                tenantId: actor.tenantId,
                price_list_item_id: itemId,
                type: "in",
                quantity: line.quantity,
                reference_type: "purchase_order",
                reference_id: String(doc._id),
                notes: `Megrendelőlap: ${doc.order_number}`,
                created_by: actor.actorId ?? "system",
              });
            } catch (err) {
              console.error("Hiba a raktárkészlet frissítésekor:", err);
            }
          }
          updatedLines.push(line);
        }

        // Save the updated lines back to the PurchaseOrder document to persist the newly created price_list_item_ids
        await PurchaseOrderModel.updateOne(
          { _id: id, tenantId: actor.tenantId },
          { $set: { lines: updatedLines } },
        );
        doc.lines = updatedLines;
      }
      // ──────────────────────────────────────────────────────────────────────

      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "settings", action: "admin", scope: "global" });
    const { id } = await params;
    const url = new URL(req.url);
    const reason = url.searchParams.get("reason") || "Törölve";
    return await withDb(async () => {
      const doc = await PurchaseOrderModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: { is_archived: true, archived_at: new Date(), archive_reason: reason } },
        { new: true },
      ).lean();
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
