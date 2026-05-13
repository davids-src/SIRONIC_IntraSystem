import { NextResponse } from "next/server";
import { z } from "zod";
import { ContractTemplateModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().nullable().optional(),
  body: z.string(),
  variables: z.array(z.string()).optional(),
  requires_digital_signature: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contract", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (q) {
        filter.name = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      }
      const rows = await ContractTemplateModel.find(filter).sort({ name: 1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "contract", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const doc = await ContractTemplateModel.create({
        tenantId: actor.tenantId,
        name: b.name,
        category: b.category,
        description: b.description ?? null,
        body: b.body,
        variables: b.variables ?? [],
        requires_digital_signature: b.requires_digital_signature ?? false,
        is_active: b.is_active ?? true,
        created_by: actor.actorId,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
