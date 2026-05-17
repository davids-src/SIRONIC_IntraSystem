import { NextResponse } from "next/server";
import { OfferModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "offer", action: "view", scope: "global" });
    const { id } = await params;
    return await withDb(async () => {
      const doc = await OfferModel.findOne({ _id: id, tenantId: actor.tenantId }).lean();
      if (!doc) {
        return NextResponse.json({ error: "Offer not found" }, { status: 404 });
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
