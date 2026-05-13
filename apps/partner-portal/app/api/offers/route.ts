import { NextResponse } from "next/server";
import { OfferModel, serializeForJson } from "@crm/db";
import { handleApiError, guard, requirePortalActor, withDb } from "@/lib/api-helpers";

export async function GET() {
  try {
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "offer", action: "view", scope: "contact" });
    return await withDb(async () => {
      const rows = await OfferModel.find({
        tenantId,
        contact_id: contactId,
      })
        .sort({ updated_at: -1 })
        .lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
