import { NextResponse } from "next/server";
import { z } from "zod";
import { PurchaseOrderModel, serializeForJson, nextCounterValue } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const lineSchema = z.object({
  price_list_item_id: z.string().nullable().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  net_unit_price: z.number(),
  tax_rate: z.number(),
});

const createSchema = z.object({
  supplier_id: z.string().min(1),
  status: z.enum(["draft", "sent", "fulfilled", "cancelled"]).optional(),
  expected_delivery_date: z.string().nullable().optional(),
  currency: z.string().default("HUF"),
  lines: z.array(lineSchema).min(1),
  notes: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "settings", action: "view", scope: "global" });
    return await withDb(async () => {
      const rows = await PurchaseOrderModel.find({ tenantId: actor.tenantId })
        .sort({ created_at: -1 })
        .lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "settings", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const year = new Date().getFullYear();
      const n = await nextCounterValue(actor.tenantId, `purchase_order_${year}`);
      const order_number = `PO-${year}-${String(n).padStart(4, "0")}`;

      const total_amount = b.lines.reduce(
        (sum, l) => sum + l.net_unit_price * l.quantity * (1 + l.tax_rate / 100),
        0,
      );

      const doc = await PurchaseOrderModel.create({
        tenantId: actor.tenantId,
        order_number,
        supplier_id: b.supplier_id,
        status: b.status ?? "draft",
        expected_delivery_date: b.expected_delivery_date
          ? new Date(b.expected_delivery_date)
          : null,
        total_amount,
        currency: b.currency,
        lines: b.lines,
        notes: b.notes ?? null,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
