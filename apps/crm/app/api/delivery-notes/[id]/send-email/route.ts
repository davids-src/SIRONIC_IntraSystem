import { NextResponse } from "next/server";
import { DeliveryNoteModel, ContactModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { sendEmail, DeliveryNoteSent } from "@sironic/emails";
import * as React from "react";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "delivery_note", action: "write", scope: "global" });

    return await withDb(async () => {
      const docRaw = await DeliveryNoteModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();

      if (!docRaw) {
        return NextResponse.json(
          { error: "Szállítólevél nem található." },
          { status: 404 },
        );
      }

      const doc = docRaw as Record<string, any>;

      if (!doc.contact_id) {
        return NextResponse.json(
          { error: "Nincs partner megadva a szállítólevélhez." },
          { status: 400 },
        );
      }

      const contactRaw = await ContactModel.findOne({
        _id: doc.contact_id,
        tenantId: actor.tenantId,
      }).lean();

      const contact = contactRaw as Record<string, any> | null;

      if (!contact || !contact.email) {
        return NextResponse.json(
          { error: "A partnernek nincs beállítva e-mail címe." },
          { status: 400 },
        );
      }

      await sendEmail({
        to: contact.email,
        subject: `Szállítólevél – ${doc.delivery_number}`,
        template: React.createElement(DeliveryNoteSent, {
          lang: "hu",
          contact_name: contact.name,
          delivery_number: doc.delivery_number,
          issue_date: new Date(doc.issue_date).toLocaleDateString("hu-HU"),
          notes: doc.notes ?? null,
          id: String(doc._id),
        }),
        lang: "hu",
      });

      return NextResponse.json(serializeForJson({ success: true }));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
