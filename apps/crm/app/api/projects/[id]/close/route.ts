import { NextResponse } from "next/server";
import {
  ProjectModel,
  ContactModel,
  ContractModel,
  WorklogModel,
  CompletionCertificateModel,
  DeliveryNoteModel,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { sendEmail, ProjectClosed } from "@sironic/emails";
import * as React from "react";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "project", action: "write", scope: "global" });

    return await withDb(async () => {
      // Find the project
      const project = await ProjectModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      });

      if (!project) {
        return NextResponse.json({ error: "Projekt nem található." }, { status: 404 });
      }

      if (project.status === "closed") {
        return NextResponse.json(
          { error: "A projekt már le van zárva." },
          { status: 400 },
        );
      }

      // Update status and closed_at
      project.status = "closed";
      project.closed_at = new Date();

      // Gather documents
      const [contracts, worklogs, certificates, deliveryNotes] = await Promise.all([
        ContractModel.find({
          project_id: id,
          tenantId: actor.tenantId,
          status: { $ne: "cancelled" },
        }).lean(),
        WorklogModel.find({
          project_id: id,
          tenantId: actor.tenantId,
          is_archived: { $ne: true },
          status: "finalized",
        }).lean(),
        CompletionCertificateModel.find({
          project_id: id,
          tenantId: actor.tenantId,
          is_archived: { $ne: true },
          status: "accepted",
        }).lean(),
        DeliveryNoteModel.find({
          project_id: id,
          tenantId: actor.tenantId,
          is_archived: { $ne: true },
          status: "issued",
        }).lean(),
      ]);

      const documentsList: { type: string; number: string }[] = [];

      contracts.forEach((c) => {
        documentsList.push({
          type: "Szerződés",
          number: c.contract_number,
        });
      });

      worklogs.forEach((w) => {
        documentsList.push({
          type: "Munkalap",
          number: w.worklog_number,
        });
      });

      certificates.forEach((c) => {
        documentsList.push({
          type: "Teljesítési Igazolás",
          number: c.certificate_number,
        });
      });

      deliveryNotes.forEach((d) => {
        documentsList.push({
          type: "Szállítólevél",
          number: d.delivery_number,
        });
      });

      // Find Contact (Partner)
      let emailSent = false;
      if (project.contact_id) {
        const contact = (await ContactModel.findOne({
          _id: project.contact_id,
          tenantId: actor.tenantId,
        }).lean()) as any;

        if (contact && contact.email) {
          try {
            await sendEmail({
              to: contact.email,
              subject: `Projekt sikeresen lezárva: ${project.name}`,
              template: React.createElement(ProjectClosed, {
                lang: "hu",
                contact_name: contact.name,
                project_name: project.name,
                id: String(project._id),
                documents: documentsList,
              }),
            });
            emailSent = true;
          } catch (emailErr) {
            console.error("Nem sikerült elküldeni a projektzáró e-mailt:", emailErr);
          }
        }
      }

      await project.save();

      return NextResponse.json({
        success: true,
        email_sent: emailSent,
        project: serializeForJson(project.toObject()),
      });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
