import { NextResponse } from "next/server";
import { requireCrmAuth, withDb, handleApiError, guard } from "@/lib/api-helpers";
import { PortalUserModel } from "@crm/db";
import crypto from "crypto";
import { sendEmail, PasswordReset } from "@crm/emails";
import * as React from "react";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contact", action: "manage", scope: "global" });

    const { id } = await params;

    return await withDb(async () => {
      const user = await PortalUserModel.findOne({ _id: id, tenantId: actor.tenantId });
      if (!user) {
        return NextResponse.json({ error: "Felhasználó nem található" }, { status: 404 });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

      user.invite_token = token;
      user.invite_token_expires = expires;
      await user.save();

      const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "https://portal.sironic.eu";
      const resetUrl = `${portalUrl}/reset-password?token=${token}`;

      await sendEmail({
        to: user.email,
        subject: "Jelszó visszaállítás - SIRONIC Partner Portál",
        template: React.createElement(PasswordReset, {
          contact_name: user.display_name || user.email,
          reset_url: resetUrl,
          lang: "hu",
        }),
      });

      return NextResponse.json({ ok: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
