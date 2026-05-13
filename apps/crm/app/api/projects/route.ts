import { NextResponse } from "next/server";
import { z } from "zod";
import { ProjectModel, formatNumber, nextCounterValue, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  contact_id: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  status: z.enum(["open", "on_hold", "closed"]).optional(),
  contract_type: z
    .enum(["project", "ongoing", "mixed", "one_time"])
    .nullable()
    .optional(),
  portal_visible: z.boolean().optional(),
  start_date: z.coerce.date().nullable().optional(),
  deadline: z.coerce.date().nullable().optional(),
  budget_hours: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "project", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (q) {
        filter.$or = [
          { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { project_number: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        ];
      }
      const rows = await ProjectModel.find(filter).sort({ updated_at: -1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "project", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const n = await nextCounterValue(actor.tenantId, "project");
      const project_number = formatNumber("PR", n);
      const doc = await ProjectModel.create({
        tenantId: actor.tenantId,
        project_number,
        contact_id: b.contact_id ?? null,
        created_by: actor.actorId,
        assigned_to: null,
        contract_type: b.contract_type ?? null,
        name: b.name,
        description: b.description,
        category: b.category ?? null,
        status: b.status ?? "open",
        start_date: b.start_date ?? null,
        deadline: b.deadline ?? null,
        closed_at: null,
        budget_hours: b.budget_hours ?? null,
        portal_visible: b.portal_visible ?? false,
        phases: [],
        staging_links: [],
        checklist: [],
        notes: b.notes ?? null,
        contract_warning_dismissed: false,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
