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

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "completion_certificate", action: "sign", scope: "contact" });
    const body = await req.json();
    return await withDb(async () => {
      const doc = await CompletionCertificateModel.findOne({
        _id: id,
        tenantId,
        contact_id: contactId,
      });
      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (body.status === "accepted") {
        doc.status = "accepted";
        doc.client_name = body.client_name || null;
        doc.client_title = body.client_title || null;
        doc.client_signature = body.client_signature || null;
        doc.signed_at = body.signed_at ? new Date(body.signed_at) : new Date();
        doc.rejection_reason = null;
      } else if (body.status === "rejected") {
        doc.status = "rejected";
        doc.rejection_reason = body.rejection_reason || null;
        doc.client_name = null;
        doc.client_title = null;
        doc.client_signature = null;
        doc.signed_at = null;
      } else {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      await doc.save();
      return NextResponse.json(serializeForJson(doc.toObject()));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
