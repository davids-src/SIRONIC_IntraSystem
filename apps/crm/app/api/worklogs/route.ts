import { NextResponse } from "next/server";
import { z } from "zod";
import { WorklogModel, formatNumber, nextCounterValue, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const priceSnapshotZodSchema = z.object({
  internal_base_price: z.number(),
  client_multiplier: z.number(),
  multiplier_key: z.string(),
  calculated_price: z.number(),
  urgency_multiplier: z.number().optional().default(1.0),
  pricing_settings_captured_at: z.string().nullable().optional(),
});

const itemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unit_price: z.number().nullable().optional(),
  price_list_item_id: z.string().nullable().optional(),
  service_price_list_item_id: z.string().nullable().optional(),
  price_snapshot: priceSnapshotZodSchema.nullable().optional(),
});

const createSchema = z.object({
  status: z.enum(["draft", "finalized"]).optional(),
  work_date: z.coerce.date(),
  work_start: z.string().nullable().optional(),
  work_end: z.string().nullable().optional(),
  technician_name: z.string().min(1),
  technician_signature: z.string().nullable().optional(),
  client_name: z.string().nullable().optional(),
  client_signature: z.string().nullable().optional(),
  site_address: z.string().nullable().optional(),
  work_category: z.string().min(1),
  work_description: z.string(),
  items: z.array(itemSchema),
  travel_km: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  contact_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  ticket_id: z.string().nullable().optional(),
  serviced_item_ids: z.array(z.string()).optional(),
  one_time_contact_name: z.string().nullable().optional(),
  one_time_contact_phone: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "worklog", action: "view", scope: "global" });
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
          { work_description: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { worklog_number: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        ];
      }
      const rows = await WorklogModel.find(filter).sort({ work_date: -1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "worklog", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const n = await nextCounterValue(actor.tenantId, "worklog");
      const worklog_number = formatNumber("WL", n);
      const doc = await WorklogModel.create({
        tenantId: actor.tenantId,
        worklog_number,
        contact_id: b.contact_id ?? null,
        one_time_contact_name: b.one_time_contact_name ?? null,
        one_time_contact_phone: b.one_time_contact_phone ?? null,
        project_id: b.project_id ?? null,
        ticket_id: b.ticket_id ?? null,
        created_by: actor.actorId,
        status: b.status ?? "draft",
        work_date: b.work_date,
        work_start: b.work_start ?? null,
        work_end: b.work_end ?? null,
        technician_name: b.technician_name,
        technician_signature: b.technician_signature ?? null,
        client_name: b.client_name ?? null,
        client_signature: b.client_signature ?? null,
        site_address: b.site_address ?? null,
        work_category: b.work_category,
        work_description: b.work_description,
        items: b.items,
        travel_km: b.travel_km ?? null,
        notes: b.notes ?? null,
        serviced_item_ids: b.serviced_item_ids ?? [],
        pdf_url: null,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
