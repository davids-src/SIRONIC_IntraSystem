import { NextResponse } from "next/server";
import { CrmUserModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { sendEmail, CrmInvite } from "@sironic/emails";
import * as React from "react";

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    if (!actor.roleKeys.includes("crm.admin")) {
      return NextResponse.json(
        { error: "Nincs jogosultságod munkatársak meghívásához." },
        { status: 403 },
      );
    }

    const { email, display_name, roleKeys } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "E-mail cím megadása kötelező." },
        { status: 400 },
      );
    }

    return await withDb(async () => {
      let user = await CrmUserModel.findOne({ email: email.toLowerCase().trim() });
      const invite_token = crypto.randomUUID();
      const invite_token_expires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

      if (!user) {
        user = await CrmUserModel.create({
          tenantId: actor.tenantId,
          email: email.toLowerCase().trim(),
          display_name: display_name || email.split("@")[0],
          roleKeys: roleKeys || ["crm.staff"],
          password_hash: "PENDING_INVITE",
          invite_token,
          invite_token_expires,
        });
      } else {
        if (user.tenantId !== actor.tenantId) {
          return NextResponse.json(
            { error: "Ez az e-mail cím már egy másik tenant-hoz tartozik." },
            { status: 400 },
          );
        }
        await CrmUserModel.updateOne(
          { _id: user._id },
          {
            $set: {
              invite_token,
              invite_token_expires,
              roleKeys: roleKeys || user.roleKeys,
            },
          },
        );
        user = await CrmUserModel.findById(user._id).lean();
      }

      const crmUrl = process.env.AUTH_URL || "http://localhost:3000";

      await sendEmail({
        to: user.email,
        subject: "Meghívó – SIRONIC CRM Rendszer",
        template: React.createElement(CrmInvite, {
          lang: "hu",
          user_name: user.display_name || user.email,
          user_email: user.email,
          token: invite_token,
          crm_url: crmUrl,
        }),
      });

      return NextResponse.json(serializeForJson(user));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
