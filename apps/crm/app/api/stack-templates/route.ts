import { NextResponse } from "next/server";
import { z } from "zod";
import { StackTemplateModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
  compose_yaml: z.string().min(1),
  placeholders: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        required: z.boolean().optional(),
        default_value: z.string().nullable().optional(),
        secret: z.boolean().optional(),
      }),
    )
    .optional(),
  required_networks: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "integration", action: "view", scope: "global" });
    return await withDb(async () => {
      const rows = await StackTemplateModel.find({ tenantId: actor.tenantId })
        .sort({ name: 1 })
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
    guard(actor, { module: "integration", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const doc = await StackTemplateModel.create({
        tenantId: actor.tenantId,
        name: b.name,
        description: b.description ?? null,
        is_default: b.is_default ?? false,
        compose_yaml: b.compose_yaml,
        placeholders: b.placeholders ?? [],
        required_networks: b.required_networks ?? ["nginxproxy_default"],
        created_by: actor.actorId,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
