import { NextResponse } from "next/server";
import { PortalUserModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requirePortalActor, withDb } from "@/lib/api-helpers";

export async function GET() {
  try {
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "partner_team", action: "manage", scope: "contact" });

    return await withDb(async () => {
      const users = await PortalUserModel.find({
        tenantId,
        contact_id: contactId,
      }).lean();
      const safeUsers = users.map((u) => {
        const { password_hash, invite_token, magic_token_hash, ...rest } = u as any;
        return rest;
      });
      return NextResponse.json(serializeForJson(safeUsers));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
