import { NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import { ContactModel, PortalUserModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requirePortalActor, withDb } from "@/lib/api-helpers";
import { sendEmail, PortalInvite } from "@sironic/emails";
import * as React from "react";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const bodySchema = z.object({
  email: z.string().email(),
  display_name: z.string().max(200).nullable().optional(),
  roleKeys: z.array(z.enum(["partner.admin", "partner.viewer"])).min(1),
});

export async function POST(req: Request) {
  try {
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "partner_team", action: "manage", scope: "contact" });
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    const email = b.email.toLowerCase();

    return await withDb(async () => {
      const contact = await ContactModel.findOne({ _id: contactId, tenantId }).lean();
      if (!contact) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const existing: any = await PortalUserModel.findOne({ email }).lean();
      if (existing && existing.contact_id !== contactId) {
        return NextResponse.json(
          { error: "Ez az e-mail cím másik partnerhez tartozik." },
          { status: 409 },
        );
      }

      const invite_token = randomUUID();
      const invite_token_expires = new Date(Date.now() + 48 * 60 * 60 * 1000);

      if (existing) {
        await PortalUserModel.updateOne(
          { _id: existing._id },
          {
            $set: {
              display_name: b.display_name ?? existing.display_name ?? null,
              roleKeys: b.roleKeys,
              invite_token: hashToken(invite_token),
              invite_token_expires,
            },
          },
        );
      } else {
        await PortalUserModel.create({
          tenantId,
          contact_id: contactId,
          email,
          password_hash: "PENDING_INVITE",
          display_name: b.display_name ?? null,
          roleKeys: b.roleKeys,
          invite_token: hashToken(invite_token),
          invite_token_expires,
        });
      }

      const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.sironic.eu";
      await sendEmail({
        to: email,
        subject: "Meghívó – SIRONIC Partner Portál",
        template: React.createElement(PortalInvite, {
          lang: "hu",
          contact_name: (contact as any).name,
          contact_email: email,
          token: invite_token,
          portal_url: portalUrl,
        }),
      });

      const saved = await PortalUserModel.findOne({ email }).lean();
      const { password_hash, invite_token: _t, magic_token_hash, ...safe } = saved as any;
      return NextResponse.json(serializeForJson(safe), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
