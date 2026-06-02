import { NextResponse } from "next/server";
import {
  WarrantyCardModel,
  ContactModel,
  SettingsModel,
  serializeForJson,
} from "@crm/db";
import { handleApiError, guard, requirePortalActor, withDb } from "@/lib/api-helpers";

/**
 * GET /api/warranties
 * Partner saját jótállási jegyeinek listázása
 */
export async function GET() {
  try {
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "warranty", action: "view", scope: "contact" });

    return await withDb(async () => {
      const rows = await WarrantyCardModel.find({
        tenantId,
        contact_id: contactId,
      })
        .sort({ created_at: -1 })
        .lean();

      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
