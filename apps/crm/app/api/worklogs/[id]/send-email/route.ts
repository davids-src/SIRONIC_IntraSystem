import { NextResponse } from "next/server";
import { WorklogModel, ContactModel } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { sendEmail, WorklogSent } from "@sironic/emails";
import * as React from "react";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "worklog", action: "write", scope: "global" });

    return await withDb(async () => {
      const docRaw = await WorklogModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();

      if (!docRaw) {
        return NextResponse.json({ error: "Munkalap nem található." }, { status: 404 });
      }

      const doc = docRaw as Record<string, any>;

      if (doc.status === "draft") {
        return NextResponse.json(
          { error: "Csak véglegesített munkalapot lehet kiküldeni." },
          { status: 400 },
        );
      }

      if (!doc.contact_id) {
        return NextResponse.json(
          { error: "Nincs ügyfél megadva ehhez a munkalaphoz." },
          { status: 400 },
        );
      }

      const contactRaw = await ContactModel.findOne({
        _id: doc.contact_id,
        tenantId: actor.tenantId,
      }).lean();
      const contact = contactRaw as Record<string, any>;

      if (!contact || !contact.email) {
        return NextResponse.json(
          { error: "Az ügyfélnek nincs beállítva e-mail címe." },
          { status: 400 },
        );
      }

      const portalUrl = process.env.PORTAL_URL || "http://localhost:3003";

      await sendEmail({
        to: contact.email,
        subject: `Elkészült a munkalap: ${doc.worklog_number}`,
        template: React.createElement(WorklogSent, {
          lang: "hu",
          worklog_number: doc.worklog_number,
          client_name: contact.name,
          date: new Date(doc.work_date).toLocaleDateString("hu-HU"),
          work_summary: doc.work_description,
          portal_url: portalUrl,
        }),
      });

      return NextResponse.json({ success: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
