import { NextResponse } from "next/server";
import { CrmUserModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

export async function GET() {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contact", action: "view", scope: "global" });
    return await withDb(async () => {
      const rows = await CrmUserModel.find({ tenantId: actor.tenantId })
        .select("_id email display_name roleKeys tenantId created_at updated_at")
        .sort({ display_name: 1, email: 1 })
        .lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
