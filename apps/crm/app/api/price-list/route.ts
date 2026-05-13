import { NextResponse } from "next/server";
import { z } from "zod";
import {
  PriceListItemModel,
  formatNumber,
  nextCounterValue,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  item_number: z.string().min(1).optional(),
  type: z.enum(["service", "product", "labor", "package"]),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().min(1),
  unit: z.string().min(1),
  net_price: z.number(),
  currency: z.string().min(1),
  tax_rate: z.number(),
  is_active: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  purchase_records: z.array(z.any()).optional(),
  last_purchase_price: z.number().nullable().optional(),
  preferred_supplier: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (q) {
        filter.$or = [
          { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { item_number: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        ];
      }
      const rows = await PriceListItemModel.find(filter).sort({ name: 1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      let item_number = b.item_number;
      if (!item_number) {
        const n = await nextCounterValue(actor.tenantId, "price_list");
        item_number = formatNumber("PL", n);
      }
      const doc = await PriceListItemModel.create({
        tenantId: actor.tenantId,
        item_number,
        type: b.type,
        name: b.name,
        description: b.description ?? null,
        category: b.category,
        unit: b.unit,
        net_price: b.net_price,
        currency: b.currency,
        tax_rate: b.tax_rate,
        is_active: b.is_active ?? true,
        notes: b.notes ?? null,
        purchase_records: b.purchase_records ?? [],
        last_purchase_price: b.last_purchase_price ?? null,
        preferred_supplier: b.preferred_supplier ?? null,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
