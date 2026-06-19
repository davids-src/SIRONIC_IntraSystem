import { NextResponse } from "next/server";
import { z } from "zod";
import { WeeklyPlanModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  assignee_id: z.string().min(1).optional(),
  week_number: z.number().min(1).max(53).optional(),
  year: z.number().min(2000).max(2100).optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["todo", "in_progress", "done", "blocked"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  ticket_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  worklog_id: z.string().nullable().optional(),
  due_date: z.coerce.date().nullable().optional(),
  is_archived: z.boolean().optional(),
  archived_at: z.string().datetime().nullable().optional(),
  archive_reason: z.string().nullable().optional(),
});

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "weekly_plan", action: "view", scope: "global" });

    return await withDb(async () => {
      const doc = await WeeklyPlanModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      }).lean();

      if (!doc) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json(serializeForJson(doc));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "weekly_plan", action: "write", scope: "global" });

    const json = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const b = parsed.data;
    const isAdmin = actor.roleKeys.includes("crm.admin");

    return await withDb(async () => {
      // Find the existing weekly plan
      const existing = await WeeklyPlanModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      });

      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Enforce ownership check for non-admins
      if (!isAdmin && existing.assignee_id !== actor.actorId) {
        return NextResponse.json(
          { error: "Forbidden: You can only modify your own plans." },
          { status: 403 },
        );
      }

      // Enforce assignee change check for non-admins
      if (!isAdmin && b.assignee_id && b.assignee_id !== actor.actorId) {
        return NextResponse.json(
          { error: "Forbidden: You cannot assign your plans to someone else." },
          { status: 403 },
        );
      }

      // Apply patches
      const patch: Record<string, unknown> = {};
      if (b.assignee_id) patch.assignee_id = b.assignee_id;
      if (b.week_number) patch.week_number = b.week_number;
      if (b.year) patch.year = b.year;
      if (b.title) patch.title = b.title;
      if (b.description !== undefined) patch.description = b.description;
      if (b.status) patch.status = b.status;
      if (b.priority) patch.priority = b.priority;
      if (b.ticket_id !== undefined) patch.ticket_id = b.ticket_id;
      if (b.project_id !== undefined) patch.project_id = b.project_id;
      if (b.worklog_id !== undefined) patch.worklog_id = b.worklog_id;
      if (b.due_date !== undefined) patch.due_date = b.due_date;
      if (b.is_archived !== undefined) {
        patch.is_archived = b.is_archived;
        patch.archived_at = b.is_archived
          ? b.archived_at
            ? new Date(b.archived_at)
            : new Date()
          : null;
        patch.archive_reason = b.is_archived ? b.archive_reason : null;
      }

      const updated = await WeeklyPlanModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        { $set: patch },
        { new: true },
      ).lean();

      return NextResponse.json(serializeForJson(updated));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "weekly_plan", action: "write", scope: "global" });

    const { searchParams } = new URL(req.url);
    const reason = searchParams.get("reason") || "Törölve";
    const isAdmin = actor.roleKeys.includes("crm.admin");

    return await withDb(async () => {
      // Find the existing weekly plan
      const existing = await WeeklyPlanModel.findOne({
        _id: id,
        tenantId: actor.tenantId,
      });

      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Enforce ownership check for non-admins
      if (!isAdmin && existing.assignee_id !== actor.actorId) {
        return NextResponse.json(
          { error: "Forbidden: You can only delete your own plans." },
          { status: 403 },
        );
      }

      // Soft delete: sets is_archived to true
      const updated = await WeeklyPlanModel.findOneAndUpdate(
        { _id: id, tenantId: actor.tenantId },
        {
          $set: {
            is_archived: true,
            archived_at: new Date(),
            archive_reason: reason,
          },
        },
        { new: true },
      ).lean();

      return NextResponse.json(serializeForJson(updated));
    });
  } catch (e) {
    return handleApiError(e);
  }
}
