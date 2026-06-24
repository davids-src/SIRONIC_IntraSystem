import { NextResponse } from "next/server";
import { z } from "zod";
import { ChecklistTemplateModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        item_id: z.string().min(1),
        text: z.string().min(1),
        is_required: z.boolean().default(false),
        order: z.number().default(0),
      }),
    )
    .optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "checklist", action: "view", scope: "global" });
    const { id } = await params;
    return await withDb(async () => {
      const doc = await ChecklistTemplateModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!doc) return NextResponse.json({ error: "Nem található" }, { status: 404 });
      return NextResponse.json(serializeForJson(doc));
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
    guard(actor, { module: "checklist", action: "write", scope: "global" });
    const { id } = await params;
    const json: unknown = await req.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    return await withDb(async () => {
      const doc = await ChecklistTemplateModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: parsed.data },
        { new: true },
      ).lean();
      if (!doc) return NextResponse.json({ error: "Nem található" }, { status: 404 });
      return NextResponse.json(serializeForJson(doc));
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
    guard(actor, { module: "checklist", action: "write", scope: "global" });
    const { id } = await params;
    return await withDb(async () => {
      // Soft delete – deaktiváljuk, nem töröljük
      await ChecklistTemplateModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: { is_active: false } },
      );
      return NextResponse.json({ success: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
