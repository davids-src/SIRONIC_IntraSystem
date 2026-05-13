import { NextResponse } from "next/server";
import { ContactModel, serializeForJson } from "@crm/db";
import { handleApiError, requirePortalAuth, withDb } from "@/lib/api-helpers";

export async function GET() {
  try {
    const { tenantId, contactId } = await requirePortalAuth();
    return await withDb(async () => {
      const doc = await ContactModel.findOne({
        _id: contactId,
        tenantId,
      }).lean();
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
