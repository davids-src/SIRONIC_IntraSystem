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

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  frequency_months: z.number().int().positive().optional(),
  next_due_date: z.string().optional(),
  is_active: z.boolean().optional(),
  template_title: z.string().min(1).optional(),
  template_description: z.string().optional().nullable(),
  template_category: z.string().optional(),
  template_priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  template_assigned_to: z.string().optional().nullable(),
  advance_days: z.number().int().min(1).max(90).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "maintenance_plan", action: "write", scope: "global" });
    const { id } = await params;
    const json: unknown = await req.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    return await withDb(async () => {
      const update: Record<string, unknown> = { ...parsed.data };
      if (parsed.data.next_due_date) {
        update.next_due_date = new Date(parsed.data.next_due_date);
      }
      const doc = await MaintenancePlanModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: update },
        { new: true },
      ).lean();
      if (!doc) return NextResponse.json({ error: "Nem található" }, { status: 404 });
      return NextResponse.json(serializeForJson(doc));
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
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "maintenance_plan", action: "write", scope: "global" });
    const { id } = await params;
    return await withDb(async () => {
      await MaintenancePlanModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: { is_active: false } },
      );
      return NextResponse.json({ success: true });
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * POST /api/maintenance-plans/[id]/trigger
 * Manuálisan generál egy karbantartási hibajegyet a sablonból.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "maintenance_plan", action: "write", scope: "global" });
    const { id } = await params;

    return await withDb(async () => {
      const plan = await MaintenancePlanModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      });
      if (!plan) return NextResponse.json({ error: "Nem található" }, { status: 404 });

      // Ticket generálás
      const n = await nextCounterValue(actor.tenantId, "ticket");
      const ticket_number = formatNumber("TK", n);

      const ticket = await TicketModel.create({
        tenantId: actor.tenantId,
        ticket_number,
        contact_id: plan.contact_id,
        project_id: plan.project_id ?? null,
        created_by: actor.actorId,
        assigned_to: plan.template_assigned_to ?? null,
        source: "crm",
        priority: plan.template_priority,
        status: "new",
        category: plan.template_category,
        title: plan.template_title,
        description: plan.template_description ?? "",
        one_time_contact_name: null,
        one_time_contact_phone: null,
        location: null,
        affected_items: null,
        attachments: [],
        comments: [],
        resolution_notes: null,
        resolved_at: null,
      });

      // Következő esedékesség kiszámítása
      const nextDate = new Date(plan.next_due_date);
      nextDate.setMonth(nextDate.getMonth() + plan.frequency_months);

      await MaintenancePlanModel.findByIdAndUpdate(id, {
        last_generated_at: new Date(),
        next_due_date: nextDate,
      });

      return NextResponse.json(
        {
          ticket_id: ticket._id.toString(),
          ticket_number,
          next_due_date: nextDate.toISOString(),
        },
        { status: 201 },
      );
    });
  } catch (e) {
    return handleApiError(e);
  }
}
