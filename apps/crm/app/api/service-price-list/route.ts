import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ServicePriceListItemModel,
  ServiceCategoryModel,
  serializeForJson,
  nextCounterValue,
  formatNumber,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { hasPermission } from "@crm/rbac";

const unitBasedTierSchema = z.object({
  label: z.string().min(1),
  min_units: z.number().int().min(0),
  max_units: z.number().int().min(0).nullable().optional(),
  base_price: z.number().min(0),
});

const createSchema = z.object({
  category_id: z.string().min(1),
  subcategory_id: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  unit: z.string().min(1),
  pricing_type: z.enum(["fixed", "hourly", "custom", "unit_based"]),
  internal_base_price: z.number().nullable().optional(),
  hourly_rate_category: z.string().nullable().optional(),
  unit_based_tiers: z.array(unitBasedTierSchema).optional(),
  notes: z.string().nullable().optional(),
  client_note: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).default(0),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "service_price_list", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const category_id = searchParams.get("category_id");
    const subcategory_id = searchParams.get("subcategory_id");
    const pricing_type = searchParams.get("pricing_type");
    const search = searchParams.get("search");
    const include_archived = searchParams.get("include_archived") === "true";

    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };

      if (!include_archived) {
        filter.is_archived = false;
      }
      if (category_id) filter.category_id = category_id;
      if (subcategory_id) filter.subcategory_id = subcategory_id;
      if (pricing_type) filter.pricing_type = pricing_type;
      if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = [
          { name: new RegExp(escaped, "i") },
          { sku: new RegExp(escaped, "i") },
          { description: new RegExp(escaped, "i") },
        ];
      }

      const rows = await ServicePriceListItemModel.find(filter)
        .sort({ category_id: 1, sort_order: 1, name: 1 })
        .lean();

      // crm.staff számára internal_base_price szűrése
      const isAdmin = hasPermission(actor, {
        module: "pricing_settings",
        action: "view",
        scope: "global",
      });

      const sanitized = rows.map((item) => {
        if (!isAdmin) {
          const { internal_base_price: _omit, ...rest } = item as any;
          return rest;
        }
        return item;
      });

      return NextResponse.json(serializeForJson(sanitized));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "service_price_list", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      // Kategória megkeresése a SKU prefix-hez
      const category = await ServiceCategoryModel.findOne({
        _id: b.category_id,
        tenantId: actor.tenantId,
      }).lean();
      if (!category) {
        return NextResponse.json({ error: "Kategória nem található" }, { status: 404 });
      }

      // SKU auto-generálás – per kategória számláló
      const counterKey = `service_sku_${(category as any).sku_prefix}`;
      const n = await nextCounterValue(actor.tenantId, counterKey);
      const sku = formatNumber((category as any).sku_prefix, n);

      const doc = await ServicePriceListItemModel.create({
        tenantId: actor.tenantId,
        sku,
        ...b,
        is_active: true,
        is_archived: false,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
