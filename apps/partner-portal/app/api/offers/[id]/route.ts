import { NextResponse } from "next/server";
import { OfferModel, serializeForJson } from "@crm/db";
import { handleApiError, guard, requirePortalActor, withDb } from "@/lib/api-helpers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "offer", action: "view", scope: "contact" });
    const { id } = await params;
    return await withDb(async () => {
      const doc = await OfferModel.findOne({
        _id: id,
        tenantId,
        contact_id: contactId,
      }).lean();
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { tenantId, contactId, actor } = await requirePortalActor();
    // Portal user only has write permission if granted
    guard(actor, { module: "offer", action: "write", scope: "contact" });
    const { id } = await params;
    const body = await req.json();

    // Portal user can only accept or reject an offer that is "sent"
    const newStatus = body.status;
    if (newStatus !== "accepted" && newStatus !== "rejected") {
      return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
    }

    return await withDb(async () => {
      const doc = await OfferModel.findOneAndUpdate(
        { _id: id, tenantId, contact_id: contactId, status: "sent" },
        { $set: { status: newStatus } },
        { new: true },
      ).lean();
      if (!doc)
        return NextResponse.json(
          { error: "Not found or not actionable" },
          { status: 404 },
        );
      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
