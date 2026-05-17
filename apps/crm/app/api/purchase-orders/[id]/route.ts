import { NextResponse } from "next/server";
import { z } from "zod";
import { PurchaseOrderModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const updateSchema = z.object({
  status: z.enum(["draft", "sent", "fulfilled", "cancelled"]).optional(),
  expected_delivery_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "settings", action: "view", scope: "global" });
    const { id } = await params;
    return await withDb(async () => {
      const doc = await PurchaseOrderModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    guard(actor, { module: "settings", action: "write", scope: "global" });
    const { id } = await params;
    const json: unknown = await req.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    return await withDb(async () => {
      const update: Record<string, unknown> = { ...parsed.data };
      if (parsed.data.expected_delivery_date) {
        update.expected_delivery_date = new Date(parsed.data.expected_delivery_date);
      }
      const doc = await PurchaseOrderModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: update },
        { new: true },
      ).lean();
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
