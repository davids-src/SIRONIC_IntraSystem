import { NextResponse } from "next/server";
import { SettingsModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

export async function GET() {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "settings", action: "view", scope: "global" });
    return await withDb(async () => {
      let doc = await SettingsModel.findOne({ tenantId: actor.tenantId }).lean();
      if (!doc) {
        const created = await SettingsModel.create({
          tenantId: actor.tenantId,
          ticket_categories: [],
          worklog_categories: [],
          project_categories: [],
          contract_categories: [],
          price_list_categories: [],
          worklog_units: [],
          contact_tags: [],
        });
        doc = created.toObject();
      }
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "settings", action: "admin", scope: "global" });
    const patch: Record<string, unknown> = await req.json();
    const allowed = [
      "ticket_categories",
      "worklog_categories",
      "project_categories",
      "contract_categories",
      "price_list_categories",
      "worklog_units",
      "contact_tags",
      "company_details",
      "item_categories",
    ] as const;
    const $set: Record<string, unknown> = {};
    for (const k of allowed) {
      if (k in patch) {
        $set[k] = patch[k];
      }
    }
    return await withDb(async () => {
      const doc = await SettingsModel.findOneAndUpdate(
        { tenantId: actor.tenantId },
        { $set },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean();
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
