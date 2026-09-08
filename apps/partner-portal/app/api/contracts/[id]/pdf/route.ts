import { NextResponse } from "next/server";
import { ContractModel } from "@crm/db";
import { guard, handleApiError, requirePortalActor, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "contract", action: "view", scope: "contact" });
    return await withDb(async () => {
      const doc = (await ContractModel.findOne({
        _id: id,
        tenantId,
        contact_id: contactId,
        portal_visible: true,
      }).lean()) as any;
      if (!doc || !doc.pdf_file?.data) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const buf = Buffer.isBuffer(doc.pdf_file.data)
        ? doc.pdf_file.data
        : Buffer.from(doc.pdf_file.data.buffer ?? doc.pdf_file.data);
      return new NextResponse(buf, {
        headers: {
          "Content-Type": doc.pdf_file.content_type || "application/pdf",
          "Content-Disposition": `inline; filename="${encodeURIComponent(doc.pdf_file.filename || "szerzodes.pdf")}"`,
          "Content-Length": String(buf.length),
          "Cache-Control": "private, no-store",
        },
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
