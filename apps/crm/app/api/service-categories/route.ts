import { NextResponse } from "next/server";
import { z } from "zod";
import { ServiceCategoryModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1),
  sku_prefix: z.string().min(1).max(5).toUpperCase(),
  icon: z.string().min(1).default("Tag"),
  color: z.string().min(1).default("#6366f1"),
  sort_order: z.number().int().min(0).default(0),
  description: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "service_categories", action: "view", scope: "global" });
    return await withDb(async () => {
      const rows = await ServiceCategoryModel.find({ tenantId: actor.tenantId })
        .sort({ sort_order: 1, name: 1 })
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
    guard(actor, { module: "service_categories", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    return await withDb(async () => {
      // Ellenőrzés: prefix egyedi-e
      const existing = await ServiceCategoryModel.findOne({
        tenantId: actor.tenantId,
        sku_prefix: parsed.data.sku_prefix.toUpperCase(),
      }).lean();
      if (existing) {
        return NextResponse.json(
          { error: `Az "${parsed.data.sku_prefix}" prefix már foglalt.` },
          { status: 409 },
        );
      }
      const doc = await ServiceCategoryModel.create({
        tenantId: actor.tenantId,
        ...parsed.data,
        sku_prefix: parsed.data.sku_prefix.toUpperCase(),
        is_active: true,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
