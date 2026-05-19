import { NextResponse } from "next/server";
import { z } from "zod";
import {
  PurchaseOrderModel,
  StockItemModel,
  StockTransactionModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const updateSchema = z.object({
  status: z.enum(["draft", "sent", "fulfilled", "cancelled"]).optional(),
  expected_delivery_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
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
        for (const line of doc.lines) {
          if (!line.price_list_item_id || line.quantity <= 0) continue;

          try {
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
              reference_type: "purchase_order",
              reference_id: String(doc._id),
              notes: `Megrendelőlap: ${doc.order_number}`,
              created_by: actor.actorId ?? "system",
            });
          } catch {
            // Nem blokkoljuk a folyamatot.
          }
        }
      }
      // ──────────────────────────────────────────────────────────────────────

      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
