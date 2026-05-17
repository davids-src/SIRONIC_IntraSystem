import { NextResponse } from "next/server";
import { ContactModel, PortalUserModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { sendEmail, PortalInvite } from "@sironic/emails";
import * as React from "react";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contact", action: "write", scope: "global" });
    const { id } = await params;

    return await withDb(async () => {
      const contact: any = await ContactModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!contact)
        return NextResponse.json({ error: "Nem található a partner." }, { status: 404 });

      if (!contact.email) {
        return NextResponse.json(
          { error: "A partnernek nincs beállítva e-mail cím. Kérjük add meg előbb." },
          { status: 400 },
        );
      }

      const invite_token = crypto.randomUUID();
      const invite_token_expires = new Date(Date.now() + 48 * 60 * 60 * 1000); // +48h

      // Upsert portal user
      let portalUser = await PortalUserModel.findOne({ contact_id: id });
      if (!portalUser) {
        portalUser = await PortalUserModel.create({
          tenantId: actor.tenantId,
          contact_id: id,
          email: contact.email,
          password_hash: "PENDING_INVITE",
          display_name: contact.name,
          roleKeys: ["partner.admin"],
          invite_token,
          invite_token_expires,
        });
      } else {
        await PortalUserModel.updateOne(
          { _id: portalUser._id },
          { $set: { invite_token, invite_token_expires, email: contact.email } },
        );
      }

      // Also enable portal access on the contact
      await ContactModel.updateOne({ _id: id }, { $set: { has_portal_access: true } });

      // Send invite email
      const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.sironic.eu";
      await sendEmail({
        to: contact.email,
        subject: "Meghívó – SIRONIC Partner Portál",
        template: React.createElement(PortalInvite, {
          lang: "hu",
          contact_name: contact.name,
          contact_email: contact.email,
          token: invite_token,
          portal_url: portalUrl,
        }),
      });

      const updated = await ContactModel.findById(id).lean();
      return NextResponse.json(serializeForJson(updated));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
