import { NextResponse } from "next/server";
import { z } from "zod";
import { ProjectExpenseModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  project_id: z.string().min(1),
  worklog_id: z.string().optional().nullable(),
  expense_type: z.enum(["fuel", "parking", "toll", "accommodation", "material", "other"]),
  description: z.string().optional().nullable(),
  amount: z.number().positive(),
  currency: z.string().default("HUF"),
  receipt_image_url: z.string().optional().nullable(),
  date: z.string().min(1), // ISO string
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "project_expense", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const project_id = searchParams.get("project_id");
    const worklog_id = searchParams.get("worklog_id");

    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (project_id) filter.project_id = project_id;
      if (worklog_id) filter.worklog_id = worklog_id;
      const rows = await ProjectExpenseModel.find(filter).sort({ date: -1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "project_expense", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const doc = await ProjectExpenseModel.create({
        tenantId: actor.tenantId,
        project_id: b.project_id,
        worklog_id: b.worklog_id ?? null,
        expense_type: b.expense_type,
        description: b.description ?? null,
        amount: b.amount,
        currency: b.currency,
        receipt_image_url: b.receipt_image_url ?? null,
        recorded_by: actor.actorId,
        date: new Date(b.date),
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
