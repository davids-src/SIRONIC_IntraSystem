import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DeliveryNoteModel,
  StockItemModel,
  StockTransactionModel,
  PriceListItemModel,
  formatNumber,
  nextCounterValue,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  contact_id: z.string().min(1),
  project_id: z.string().nullable().optional(),
  issue_date: z.string().min(1),
  status: z.enum(["draft", "issued"]).default("draft"),
  lines: z
    .array(
      z.object({
        price_list_item_id: z.string().min(1),
        name: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.string().min(1),
      }),
    )
    .min(1),
  notes: z.string().nullable().optional(),
});

/**
 * GET /api/delivery-notes
 * Szállítólevelek listázása szűréssel
 */
export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "delivery_note", action: "view", scope: "global" });

    const { searchParams } = new URL(req.url);
    const contact_id = searchParams.get("contact_id");
    const project_id = searchParams.get("project_id");
    const status = searchParams.get("status");
    const includeArchived = searchParams.get("include_archived") === "true";

    return await withDb(async () => {
      const query: Record<string, any> = { tenantId: actor.tenantId };
      if (!includeArchived) {
        query.is_archived = { $ne: true };
      }
      if (contact_id) query.contact_id = contact_id;
      if (project_id) query.project_id = project_id;
      if (status) query.status = status;

      const rows = await DeliveryNoteModel.find(query).sort({ created_at: -1 }).lean();

      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * POST /api/delivery-notes
 * Új szállítólevél létrehozása
 */
export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "delivery_note", action: "write", scope: "global" });

    const json = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const b = parsed.data;

    return await withDb(async () => {
      const n = await nextCounterValue(actor.tenantId, "delivery_note");
      const delivery_number = formatNumber("SZL", n);

      const doc = await DeliveryNoteModel.create({
        tenantId: actor.tenantId,
        delivery_number,
        contact_id: b.contact_id,
        project_id: b.project_id || null,
        status: b.status,
        issue_date: new Date(b.issue_date),
        lines: b.lines,
        notes: b.notes || null,
        created_by: actor.actorId ?? "system",
      });

      // Ha azonnal kiadott (issued) státuszban hozzuk létre, levonjuk a raktárból
      if (b.status === "issued") {
        for (const line of b.lines) {
          try {
            const item = await PriceListItemModel.findOne({
              _id: line.price_list_item_id,
              tenantId: actor.tenantId,
            }).lean();
            if (item && (item as any).type !== "product") {
              continue; // Only deduct stock for product type items
            }

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
              reference_type: "manual",
              reference_id: String(doc._id),
              notes: `Szállítólevél: ${delivery_number}`,
              created_by: actor.actorId ?? "system",
            });
          } catch (err) {
            console.error("Hiba a készlet levonásakor:", err);
          }
        }
      }

      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
