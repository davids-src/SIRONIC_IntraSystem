import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ServiceCategoryModel,
  ServicePriceListItemModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  sort_order: z.number().int().min(0).optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  // sku_prefix csak akkor módosítható, ha nincs tétel a kategóriában
  sku_prefix: z.string().min(1).max(5).toUpperCase().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "service_categories", action: "write", scope: "global" });
    const { id } = await params;
    const json: unknown = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    return await withDb(async () => {
      const category = await ServiceCategoryModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!category) {
        return NextResponse.json({ error: "Nem található" }, { status: 404 });
      }

      // SKU prefix módosítás ellenőrzése
      if (
        parsed.data.sku_prefix &&
        parsed.data.sku_prefix !== (category as any).sku_prefix
      ) {
        const itemCount = await ServicePriceListItemModel.countDocuments({
          tenantId: actor.tenantId,
          category_id: id,
        });
        if (itemCount > 0) {
          return NextResponse.json(
            {
              error:
                "A prefix nem módosítható, mert a kategóriához már tartoznak tételek. A meglévő SKU-k inkonzisztenssé válnának.",
            },
            { status: 409 },
          );
        }
      }

      const updated = await ServiceCategoryModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: parsed.data },
        { new: true },
      ).lean();
      return NextResponse.json(serializeForJson(updated));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "service_categories", action: "admin", scope: "global" });
    const { id } = await params;
    return await withDb(async () => {
      // Soft-delete: is_active: false
      const updated = await ServiceCategoryModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: { is_active: false } },
        { new: true },
      ).lean();
      if (!updated) {
        return NextResponse.json({ error: "Nem található" }, { status: 404 });
      }
      return NextResponse.json(serializeForJson(updated));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
