import { NextResponse } from "next/server";
import { z } from "zod";
import { ServiceSubCategoryModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
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
      const updated = await ServiceSubCategoryModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: parsed.data },
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "service_categories", action: "admin", scope: "global" });
    const { id } = await params;
    return await withDb(async () => {
      const updated = await ServiceSubCategoryModel.findOneAndUpdate(
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
