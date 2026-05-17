import { NextResponse } from "next/server";
import { SettingsModel, ContactModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requirePortalActor, withDb } from "@/lib/api-helpers";
import type { CompanyDetails } from "@crm/types";

export async function GET() {
  try {
    const { tenantId, contactId, actor } = await requirePortalActor();
    // Use an existing guard logic or just check if actor exists
    guard(actor, { module: "worklog", action: "view", scope: "contact" });

    return await withDb(async () => {
      const settings = (await SettingsModel.findOne({ tenantId }).lean()) as unknown as {
        company_details?: CompanyDetails;
      };
      const contact = await ContactModel.findOne({ _id: contactId, tenantId }).lean();

      return NextResponse.json(
        serializeForJson({
          provider: settings?.company_details || null,
          client: contact || null,
        }),
      );
    });
  } catch (e) {
    return handleApiError(e);
  }
}
