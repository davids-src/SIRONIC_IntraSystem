import { NextResponse } from "next/server";
import { ContractModel, serializeForJson } from "@crm/db";
import { handleApiError, guard, requirePortalActor, withDb } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "contract", action: "view", scope: "contact" });
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id")?.trim();
    return await withDb(async () => {
      const filter: Record<string, unknown> = {
        tenantId,
        contact_id: contactId,
        portal_visible: true,
      };
      if (projectId) {
        filter.project_id = projectId;
      }
      const rows = await ContractModel.find(filter).sort({ updated_at: -1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
