import { NextResponse } from "next/server";
import { z } from "zod";
import { LeadModel, serializeForJson } from "@crm/db";
import {
  guard,
  handleApiError,
  requireCrmAuth,
  withDb,
  HttpError,
} from "@/lib/api-helpers";
import { logAuditEvent, dispatchNotification } from "@crm/lib/server";

const updateLeadSchema = z.object({
  company_name: z.string().min(1).optional(),
  contact_name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  assigned_to: z.string().nullable().optional(),
  assigned_user_name: z.string().nullable().optional(),
  estimated_value: z.number().nullable().optional(),
  status: z
    .enum([
      "target",
      "contacted",
      "replied",
      "meeting",
      "quotation_needed",
      "quotation_sent",
      "follow_up",
      "negotiation",
      "won",
      "lost",
      "no_response",
      "later",
      "not_relevant",
    ])
    .optional(),
  next_action: z.string().nullable().optional(),
  next_action_at: z.coerce.date().nullable().optional(),
  next_action_assigned_to: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  contact_id: z.string().nullable().optional(),
  offer_id: z.string().nullable().optional(),
  business_unit: z.string().nullable().optional(),
  lost_reason: z.string().nullable().optional(),
  lost_reason_custom: z.string().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "lead", action: "view", scope: "global" });

    return await withDb(async () => {
      const doc = await LeadModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();

      if (!doc) {
        throw new HttpError(404, "Lead not found");
      }

      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { actor, session } = await requireCrmAuth();
    guard(actor, { module: "lead", action: "write", scope: "global" });

    const json: unknown = await req.json();
    const parsed = updateLeadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    return await withDb(async () => {
      const existing = await LeadModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      });

      if (!existing) {
        throw new HttpError(404, "Lead not found");
      }

      const prevStatus = existing.status;
      const newStatus = parsed.data.status;

      // If status changed, automatically log activity
      if (newStatus && newStatus !== prevStatus) {
        existing.activities.push({
          type: "status_change",
          timestamp: new Date(),
          user_id: session.user.id,
          user_name: session.user.name || session.user.email || "Felhasználó",
          text: `Státusz módosítva: ${prevStatus} ➔ ${newStatus}`,
        } as any);

        await logAuditEvent({
          tenantId: actor.tenantId,
          userId: session.user.id,
          userName: session.user.name || session.user.email || "Felhasználó",
          action: "lead.status_change",
          entityType: "lead",
          entityId: id,
          summary: `${existing.company_name} státusza megváltozott (${prevStatus} ➔ ${newStatus})`,
          changes: { status: { before: prevStatus, after: newStatus } },
        });

        await dispatchNotification({
          tenantId: actor.tenantId,
          eventType: "lead.status_change",
          title: "Megkeresés státuszváltás",
          message: `${existing.company_name} státusza módosult: ${newStatus}`,
          entityType: "lead",
          entityId: id,
          href: `/leads`,
        });
      }

      Object.assign(existing, parsed.data);
      await existing.save();

      return NextResponse.json(serializeForJson(existing));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "lead", action: "admin", scope: "global" });

    return await withDb(async () => {
      const doc = await LeadModel.findOneAndDelete({
        _id: id,
        tenantId: actor.tenantId,
      });

      if (!doc) {
        throw new HttpError(404, "Lead not found");
      }

      return NextResponse.json({ success: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
