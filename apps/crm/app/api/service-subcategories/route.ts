import { NextResponse } from "next/server";
import { z } from "zod";
import { ServiceSubCategoryModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  category_id: z.string().min(1),
  name: z.string().min(1),
  sort_order: z.number().int().min(0).default(0),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "service_categories", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const category_id = searchParams.get("category_id");
    return await withDb(async () => {
      const filter: Record<string, unknown> = {
        tenantId: actor.tenantId,
        is_active: true,
      };
      if (category_id) filter.category_id = category_id;
      const rows = await ServiceSubCategoryModel.find(filter)
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
      const doc = await ServiceSubCategoryModel.create({
        tenantId: actor.tenantId,
        ...parsed.data,
        is_active: true,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
