import { NextResponse } from "next/server";
import { z } from "zod";
import { WeeklyPlanModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  assignee_id: z.string().min(1),
  week_number: z.number().min(1).max(53),
  year: z.number().min(2000).max(2100),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(["todo", "in_progress", "done", "blocked"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  ticket_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  worklog_id: z.string().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "weekly_plan", action: "view", scope: "global" });

    const { searchParams } = new URL(req.url);
    const weekStr = searchParams.get("week_number");
    const yearStr = searchParams.get("year");
    const assigneeId = searchParams.get("assignee_id");
    const includeArchived = searchParams.get("include_archived") === "true";

    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };

      if (!includeArchived) {
        filter.is_archived = { $ne: true };
      }

      if (weekStr) {
        filter.week_number = parseInt(weekStr, 10);
      }

      if (yearStr) {
        filter.year = parseInt(yearStr, 10);
      }

      if (assigneeId) {
        filter.assignee_id = assigneeId;
      }

      const rows = await WeeklyPlanModel.find(filter)
        .sort({ priority: 1, updated_at: -1 })
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
    guard(actor, { module: "weekly_plan", action: "write", scope: "global" });

    const json = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const b = parsed.data;

    // Enforce that non-admins can only create plans for themselves
    const isAdmin = actor.roleKeys.includes("crm.admin");
    if (!isAdmin && b.assignee_id !== actor.actorId) {
      return NextResponse.json(
        { error: "Forbidden: Non-admin users can only create plans for themselves." },
        { status: 403 },
      );
    }

    return await withDb(async () => {
      const doc = await WeeklyPlanModel.create({
        tenantId: actor.tenantId,
        assignee_id: b.assignee_id,
        week_number: b.week_number,
        year: b.year,
        title: b.title,
        description: b.description ?? null,
        status: b.status ?? "todo",
        priority: b.priority ?? "medium",
        ticket_id: b.ticket_id ?? null,
        project_id: b.project_id ?? null,
        worklog_id: b.worklog_id ?? null,
        due_date: b.due_date ?? null,
        created_by: actor.actorId,
      });

      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
