import { NextResponse } from "next/server";
import { OfferModel, serializeForJson } from "@crm/db";
import { handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { actor } = await requireCrmAuth();
    const { id } = await params;

    return await withDb(async () => {
      // Find all offers where this item was used
      const offers = await OfferModel.find({
        tenantId: actor.tenantId,
        "lines.price_list_item_id": id,
      })
        .sort({ created_at: -1 })
        .select("_id title offer_number created_at contact_id status")
        .lean();

      // We could also search worklogs or invoices if they exist, but for now we focus on offers

      return NextResponse.json({ offers: serializeForJson(offers) });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
