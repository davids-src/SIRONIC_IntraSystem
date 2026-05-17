import { NextResponse } from "next/server";
import { OfferModel, ContactModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { sendEmail, OfferSent } from "@sironic/emails";
import * as React from "react";

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "offer", action: "write", scope: "global" });
    const { id } = await params;

    return await withDb(async () => {
      const offer: any = await OfferModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();
      if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const contact: any = await ContactModel.findById(offer.contact_id).lean();
      if (!contact || !contact.email) {
        return NextResponse.json(
          { error: "A partnernek nincs beállítva e-mail címe." },
          { status: 400 },
        );
      }

      // Ensure public token exists
      if (!offer.public_token) {
        const public_token = crypto.randomUUID();
        await OfferModel.updateOne({ _id: id }, { $set: { public_token } });
        offer.public_token = public_token;
      }

      // Generate the public link
      // Portal URL could be in env, or hardcoded if env not available
      const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.sironic.eu";
      const pdf_url = `${portalUrl}/public/offers/${offer._id}/pdf?token=${offer.public_token}`;

      const totalNet = offer.lines.reduce(
        (sum: number, l: any) => sum + l.net_unit_price * l.quantity,
        0,
      );

      const emailTemplate = React.createElement(OfferSent, {
        lang: "hu",
        contact_name: contact.name,
        offer_number: offer.offer_number,
        valid_until: offer.valid_until
          ? new Date(offer.valid_until).toLocaleDateString("hu-HU")
          : "Visszavonásig",
        total_net: fmt(totalNet),
        id: String(offer._id),
        pdf_url,
      });

      await sendEmail({
        to: contact.email,
        subject: `Árajánlat - ${offer.offer_number}`,
        template: emailTemplate,
        lang: "hu",
      });

      // Update offer status if it was draft
      let updatedOffer = offer;
      if (offer.status === "draft") {
        updatedOffer =
          (await OfferModel.findOneAndUpdate(
            { _id: id },
            { $set: { status: "sent" } },
            { new: true },
          ).lean()) || offer;
      }

      return NextResponse.json(serializeForJson(updatedOffer));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
