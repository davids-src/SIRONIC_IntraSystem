import { NextResponse } from "next/server";
import { z } from "zod";
import {
  MaintenancePlanModel,
  TicketModel,
  formatNumber,
  nextCounterValue,
  serializeForJson,
} from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  title: z.string().min(1),
  contact_id: z.string().min(1),
  project_id: z.string().optional().nullable(),
  frequency_months: z.number().int().positive(),
  next_due_date: z.string().min(1),
  is_active: z.boolean().default(true),
  template_title: z.string().min(1),
  template_description: z.string().optional().nullable(),
  template_category: z.string().default("Preventív karbantartás"),
  template_priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  template_assigned_to: z.string().optional().nullable(),
  advance_days: z.number().int().min(1).max(90).default(14),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "maintenance_plan", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const contact_id = searchParams.get("contact_id");
    const activeOnly = searchParams.get("active") !== "false";

    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (contact_id) filter.contact_id = contact_id;
      if (activeOnly) filter.is_active = true;
      const rows = await MaintenancePlanModel.find(filter)
        .sort({ next_due_date: 1 })
        .lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "maintenance_plan", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const doc = await MaintenancePlanModel.create({
        tenantId: actor.tenantId,
        title: b.title,
        contact_id: b.contact_id,
        project_id: b.project_id ?? null,
        frequency_months: b.frequency_months,
        next_due_date: new Date(b.next_due_date),
        is_active: b.is_active,
        template_title: b.template_title,
        template_description: b.template_description ?? null,
        template_category: b.template_category,
        template_priority: b.template_priority,
        template_assigned_to: b.template_assigned_to ?? null,
        advance_days: b.advance_days,
        created_by: actor.actorId,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
