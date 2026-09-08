import { NextResponse } from "next/server";
import { z } from "zod";
import { CompletionCertificateModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requirePortalActor, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

const patchBodySchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  client_name: z.string().max(200).nullable().optional(),
  client_title: z.string().max(200).nullable().optional(),
  client_signature: z.string().max(200_000).nullable().optional(),
  signed_at: z.coerce.date().optional(),
  rejection_reason: z.string().max(2000).nullable().optional(),
});

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
    const json: unknown = await req.json();
    const parsed = patchBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;
    return await withDb(async () => {
      // Csak "sent" státuszú, még el nem bírált igazolás fogadható el / utasítható
      // el a portálon – ez zárja a draft-bírálás és a már lezárt igazolás
      // átírásának lehetőségét.
      const doc = await CompletionCertificateModel.findOne({
        _id: id,
        tenantId,
        contact_id: contactId,
        status: "sent",
      });
      if (!doc) {
        return NextResponse.json(
          { error: "Not found or not actionable" },
          { status: 404 },
        );
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
