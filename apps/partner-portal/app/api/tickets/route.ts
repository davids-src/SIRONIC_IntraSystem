import { NextResponse } from "next/server";
import { z } from "zod";
import { TicketModel, formatNumber, nextCounterValue, serializeForJson } from "@crm/db";
import { guard, handleApiError, requirePortalActor, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  category: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  project_id: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  affected_items: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { tenantId, contactId, actor } = await requirePortalActor();
    guard(actor, { module: "ticket", action: "view", scope: "contact" });
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id")?.trim();
    return await withDb(async () => {
      const filter: Record<string, unknown> = {
        tenantId,
        contact_id: contactId,
      };
      if (projectId) {
        filter.project_id = projectId;
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
    const { tenantId, contactId, portalUserId, actor } = await requirePortalActor();
    guard(actor, { module: "ticket", action: "write", scope: "contact" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const n = await nextCounterValue(tenantId, "ticket");
      const ticket_number = formatNumber("TK", n);
      const doc = await TicketModel.create({
        tenantId,
        ticket_number,
        contact_id: contactId,
        one_time_contact_name: null,
        one_time_contact_phone: null,
        created_by: portalUserId,
        assigned_to: null,
        source: "partner_portal",
        priority: b.priority ?? "medium",
        status: "new",
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
