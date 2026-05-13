import { NextResponse } from "next/server";
import { CompletionCertificateModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requirePortalActor, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "completion_certificate", action: "view", scope: "contact" });
    return await withDb(async () => {
      const doc = await CompletionCertificateModel.findOne({
        _id: id,
        tenantId,
        contact_id: contactId,
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
