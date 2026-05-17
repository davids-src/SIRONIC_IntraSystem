import { NextResponse } from "next/server";
import { z } from "zod";
import { PriceListItemModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const recordSchema = z.object({
  supplier_name: z.string().min(1),
  supplier_item_number: z.string().nullable().optional(),
  net_purchase_price: z.number().min(0),
  purchased_at: z.string().or(z.date()),
  notes: z.string().nullable().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "write", scope: "global" });
    const { id } = await params;

    const json: unknown = await req.json();
    const parsed = recordSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const b = parsed.data;
    return await withDb(async () => {
      const newRecord = {
        _id: crypto.randomUUID(),
        supplier_name: b.supplier_name,
        supplier_item_number: b.supplier_item_number ?? null,
        net_purchase_price: b.net_purchase_price,
        purchased_at: new Date(b.purchased_at),
        notes: b.notes ?? null,
      };

      const doc = await PriceListItemModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        {
          $push: { purchase_records: newRecord },
          $set: {
            last_purchase_price: newRecord.net_purchase_price,
            preferred_supplier: newRecord.supplier_name,
          },
        },
        { new: true },
      ).lean();

      if (!doc) {
        return NextResponse.json(
          { error: "Árlista tétel nem található" },
          { status: 404 },
        );
      }

      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
