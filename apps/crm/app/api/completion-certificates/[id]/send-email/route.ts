import { NextResponse } from "next/server";
import { CompletionCertificateModel, ContactModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { sendEmail, CertificateSent } from "@sironic/emails";
import * as React from "react";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "completion_certificate", action: "write", scope: "global" });

    return await withDb(async () => {
      const docRaw = await CompletionCertificateModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();

      if (!docRaw) {
        return NextResponse.json(
          { error: "Teljesítési igazolás nem található." },
          { status: 404 },
        );
      }

      const doc = docRaw as Record<string, any>;

      // Priority: recipient_email > contact email
      let toEmail: string | null = doc.recipient_email ?? null;
      let toName: string = doc.recipient_name ?? "";

      if (!toEmail && doc.contact_id) {
        const contactRaw = await ContactModel.findOne({
          _id: doc.contact_id,
          tenantId: actor.tenantId,
        }).lean();
        const contact = contactRaw as Record<string, any> | null;
        if (contact?.email) {
          toEmail = contact.email;
          if (!toName) toName = contact.name ?? "";
        }
      }

      if (!toEmail) {
        return NextResponse.json(
          {
            error:
              "Nincs megadott e-mail cím a küldéshez (recipient_email vagy partner e-mail).",
          },
          { status: 400 },
        );
      }

      const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString("hu-HU") : "–");

      await sendEmail({
        to: toEmail,
        subject: `Teljesítési igazolás – ${doc.certificate_number}`,
        template: React.createElement(CertificateSent, {
          lang: "hu",
          contact_name: toName || "Tisztelt Ügyfelünk",
          certificate_number: doc.certificate_number,
          title: doc.title,
          work_period_start: fmtDate(doc.work_period_start),
          work_period_end: fmtDate(doc.work_period_end),
          total_hours: doc.total_hours != null ? String(doc.total_hours) : null,
          id: String(doc._id),
        }),
        lang: "hu",
      });

      // Mark as sent if still draft
      if (doc.status === "draft") {
        await CompletionCertificateModel.updateOne(
          { _id: id },
          { $set: { status: "sent" } },
        );
      }

      return NextResponse.json(serializeForJson({ success: true }));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
