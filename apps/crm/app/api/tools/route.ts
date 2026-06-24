import { NextResponse } from "next/server";
import { z } from "zod";
import { ToolModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional().nullable(),
  model_number: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  status: z
    .enum(["in_warehouse", "checked_out", "maintenance", "lost", "retired"])
    .default("in_warehouse"),
  assigned_to: z.string().optional().nullable(),
  condition: z.enum(["new", "good", "fair", "poor"]).default("good"),
  notes: z.string().optional().nullable(),
});

/**
 * GET /api/tools
 * Szerszámok és gépek listázása
 */
export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "tools", action: "view", scope: "global" });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const assigned_to = searchParams.get("assigned_to");

    return await withDb(async () => {
      const query: Record<string, unknown> = { tenantId: actor.tenantId };
      if (status) query.status = status;
      if (assigned_to) query.assigned_to = assigned_to;

      const rows = await ToolModel.find(query).sort({ name: 1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * POST /api/tools
 * Új szerszám/gép felvétele
 */
export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "tools", action: "write", scope: "global" });

    const json = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const b = parsed.data;

    return await withDb(async () => {
      const doc = await ToolModel.create({
        tenantId: actor.tenantId,
        name: b.name,
        brand: b.brand || null,
        model_number: b.model_number || null,
        serial_number: b.serial_number || null,
        status: b.status,
        assigned_to: b.assigned_to || null,
        condition: b.condition,
        notes: b.notes || null,
      });

      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
