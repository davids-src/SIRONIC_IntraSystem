import { NextResponse } from "next/server";
import { WorklogModel, serializeForJson } from "@crm/db";
import { handleApiError, guard, requirePortalActor, withDb } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "worklog", action: "view", scope: "contact" });
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id")?.trim();
    return await withDb(async () => {
      const filter: Record<string, unknown> = {
        tenantId,
        contact_id: contactId,
      };
      if (projectId) {
        filter.project_id = projectId;
      }
      const rows = await WorklogModel.find(filter).sort({ work_date: -1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
