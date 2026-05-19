import { NextResponse } from "next/server";
import { z } from "zod";
import { WarehouseLocationModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
});

/**
 * GET /api/warehouse/locations
 * Összes raktárhely listázása.
 */
export async function GET(_req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "view", scope: "global" });

    return await withDb(async () => {
      const rows = await WarehouseLocationModel.find({ tenantId: actor.tenantId })
        .sort({ code: 1 })
        .lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * POST /api/warehouse/locations
 * Új raktárhely létrehozása.
 */
export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "price_list", action: "write", scope: "global" });

    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    return await withDb(async () => {
      // Check uniqueness
      const existing = await WarehouseLocationModel.findOne({
        tenantId: actor.tenantId,
        code: b.code,
      }).lean();
      if (existing) {
        return NextResponse.json(
          { error: `A(z) "${b.code}" kód már létezik.` },
          { status: 409 },
        );
      }

      const doc = await WarehouseLocationModel.create({
        tenantId: actor.tenantId,
        code: b.code,
        name: b.name,
        description: b.description ?? null,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
