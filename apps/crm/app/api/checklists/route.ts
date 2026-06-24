import { NextResponse } from "next/server";
import { z } from "zod";
import { ChecklistTemplateModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1),
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
    .default([]),
});

/**
 * GET /api/checklists
 */
export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "checklist", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") !== "false";

    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (activeOnly) filter.is_active = true;
      const rows = await ChecklistTemplateModel.find(filter).sort({ name: 1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * POST /api/checklists
 */
export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "checklist", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const doc = await ChecklistTemplateModel.create({
        tenantId: actor.tenantId,
        name: b.name,
        description: b.description ?? null,
        category: b.category ?? null,
        items: b.items,
        is_active: true,
        created_by: actor.actorId,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
