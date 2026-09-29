import { NextResponse } from "next/server";
import { z } from "zod";
import {
  LeadModel,
  ContactModel,
  formatNumber,
  nextCounterValue,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { logAuditEvent, dispatchNotification } from "@crm/lib/server";

const createLeadSchema = z.object({
  company_name: z.string().min(1),
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
  business_unit: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "lead", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status")?.trim();
    const contactId = searchParams.get("contact_id")?.trim();
    const assignedTo = searchParams.get("assigned_to")?.trim();

    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (status) {
        filter.status = status;
      }
      if (contactId) {
        filter.contact_id = contactId;
      }
      if (assignedTo) {
        filter.assigned_to = assignedTo;
      }
      if (q) {
        filter.$or = [
          { company_name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { contact_name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { lead_number: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { email: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        ];
      }

      const rows = await LeadModel.find(filter).sort({ updated_at: -1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor, session } = await requireCrmAuth();
    guard(actor, { module: "lead", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createLeadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    return await withDb(async () => {
      const n = await nextCounterValue(actor.tenantId, "lead");
      const lead_number = formatNumber("LEAD", n);

      const initialActivity = {
        type: "note" as const,
        timestamp: new Date(),
        user_id: session.user.id,
        user_name: session.user.name || session.user.email || "Rendszer",
        text: "Megkeresés / Lead létrehozva a rendszerben.",
      };

      const doc = await LeadModel.create({
        ...parsed.data,
        tenantId: actor.tenantId,
        lead_number,
        status: parsed.data.status || "target",
        activities: [initialActivity],
      });

      // Audit log
      await logAuditEvent({
        tenantId: actor.tenantId,
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Felhasználó",
        action: "lead.create",
        entityType: "lead",
        entityId: doc._id.toString(),
        summary: `Új megkeresés létrehozva: ${doc.company_name} (${lead_number})`,
      });

      // Notify
      await dispatchNotification({
        tenantId: actor.tenantId,
        eventType: "lead.created",
        title: "Új megkeresés",
        message: `${doc.company_name} megkeresés rögzítve (${lead_number})`,
        entityType: "lead",
        entityId: doc._id.toString(),
        href: `/leads`,
        recipientUserIds: parsed.data.assigned_to ? [parsed.data.assigned_to] : undefined,
        broadcastToAllStaff: !parsed.data.assigned_to,
      });

      return NextResponse.json(serializeForJson(doc), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
