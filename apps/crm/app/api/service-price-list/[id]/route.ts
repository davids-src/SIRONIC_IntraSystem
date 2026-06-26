import { NextResponse } from "next/server";
import { z } from "zod";
import { ServicePriceListItemModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { hasPermission } from "@crm/rbac";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  unit: z.string().min(1).optional(),
  pricing_type: z.enum(["fixed", "hourly", "custom", "unit_based"]).optional(),
  internal_base_price: z.number().nullable().optional(),
  hourly_rate_category: z.string().nullable().optional(),
  unit_based_tiers: z
    .array(
      z.object({
        label: z.string(),
        min_units: z.number(),
        max_units: z.number().nullable().optional(),
        base_price: z.number(),
      }),
    )
    .optional(),
  notes: z.string().nullable().optional(),
  client_note: z.string().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  subcategory_id: z.string().nullable().optional(),
});

const archiveSchema = z.object({
  is_archived: z.literal(true),
  archive_reason: z.string().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "service_price_list", action: "view", scope: "global" });
    const { id } = await params;
    return await withDb(async () => {
      const item = await ServicePriceListItemModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!item) {
        return NextResponse.json({ error: "Nem található" }, { status: 404 });
      }

      const isAdmin = hasPermission(actor, {
        module: "pricing_settings",
        action: "view",
        scope: "global",
      });
      if (!isAdmin) {
        const { internal_base_price: _omit, ...rest } = item as any;
        return NextResponse.json(serializeForJson(rest));
      }
      return NextResponse.json(serializeForJson(item));
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
    guard(actor, { module: "service_price_list", action: "write", scope: "global" });
    const { id } = await params;
    const json: unknown = await req.json();

    // Archive-request kezelése
    const archiveParsed = archiveSchema.safeParse(json);
    if (archiveParsed.success) {
      return await withDb(async () => {
        const updated = await ServicePriceListItemModel.findOneAndUpdate(
          { _id: id, tenantId: actor.tenantId },
          {
            $set: {
              is_archived: true,
              archived_at: new Date(),
              archive_reason: archiveParsed.data.archive_reason ?? null,
            },
          },
          { new: true },
        ).lean();
        if (!updated)
          return NextResponse.json({ error: "Nem található" }, { status: 404 });
        return NextResponse.json(serializeForJson(updated));
      });
    }

    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    return await withDb(async () => {
      const updated = await ServicePriceListItemModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: parsed.data },
        { new: true },
      ).lean();
      if (!updated) return NextResponse.json({ error: "Nem található" }, { status: 404 });
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
    guard(actor, { module: "service_price_list", action: "admin", scope: "global" });
    const { id } = await params;
    return await withDb(async () => {
      const updated = await ServicePriceListItemModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: { is_archived: true, archived_at: new Date() } },
        { new: true },
      ).lean();
      if (!updated) return NextResponse.json({ error: "Nem található" }, { status: 404 });
      return NextResponse.json(serializeForJson(updated));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
