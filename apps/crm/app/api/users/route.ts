import { NextResponse } from "next/server";
import { CrmUserModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    // Use an admin role check or general access check. Assuming admin is required to manage users.
    if (!actor.roleKeys.includes("crm.admin")) {
      return NextResponse.json(
        { error: "Nincs jogosultságod munkatársak kezeléséhez." },
        { status: 403 },
      );
    }

    return await withDb(async () => {
      const users = await CrmUserModel.find({ tenantId: actor.tenantId })
        .select("-password_hash")
        .lean();
      return NextResponse.json(serializeForJson(users));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
