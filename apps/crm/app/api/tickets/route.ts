import { NextResponse } from "next/server";
import { z } from "zod";
import { TicketModel, formatNumber, nextCounterValue, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  category: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["new", "in_progress", "waiting", "resolved", "closed"]).optional(),
  source: z.enum(["crm", "partner_portal", "phone", "email", "walk_in"]).optional(),
  contact_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  one_time_contact_name: z.string().nullable().optional(),
  one_time_contact_phone: z.string().nullable().optional(),
  assigned_to: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  affected_items: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "ticket", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const contactId = searchParams.get("contact_id")?.trim();
    const projectId = searchParams.get("project_id")?.trim();
    const includeArchived = searchParams.get("include_archived") === "true";
    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (!includeArchived) {
        filter.is_archived = { $ne: true };
      }
      if (contactId) {
        filter.contact_id = contactId;
      }
      if (projectId) {
        filter.project_id = projectId;
      }
      if (q) {
        filter.$or = [
          { title: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { ticket_number: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        ];
      }
      const rows = await TicketModel.find(filter).sort({ updated_at: -1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "ticket", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const n = await nextCounterValue(actor.tenantId, "ticket");
      const ticket_number = formatNumber("TK", n);
      const doc = await TicketModel.create({
        tenantId: actor.tenantId,
        ticket_number,
        contact_id: b.contact_id ?? null,
        one_time_contact_name: b.one_time_contact_name ?? null,
        one_time_contact_phone: b.one_time_contact_phone ?? null,
        created_by: actor.actorId,
        assigned_to: b.assigned_to ?? null,
        source: b.source ?? "crm",
        priority: b.priority ?? "medium",
        status: b.status ?? "new",
        category: b.category,
        title: b.title,
        description: b.description,
        project_id: b.project_id ?? null,
        location: b.location ?? null,
        affected_items: b.affected_items ?? null,
        attachments: [],
        comments: [],
        resolution_notes: null,
        resolved_at: null,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
