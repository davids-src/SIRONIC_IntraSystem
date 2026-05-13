import { NextResponse } from "next/server";
import { InventoryItemModel, serializeForJson } from "@crm/db";
import { handleApiError, requirePortalAuth, withDb } from "@/lib/api-helpers";

export async function GET() {
  try {
    const { tenantId, contactId } = await requirePortalAuth();
    return await withDb(async () => {
      const rows = await InventoryItemModel.find({
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
