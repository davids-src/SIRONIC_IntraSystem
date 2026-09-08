import { NextResponse } from "next/server";
import { z } from "zod";
import { DeploymentPackageModel, serializeForJson } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price_huf: z.number().nonnegative(),
  default_cycle: z.enum(["monthly", "quarterly", "yearly"]),
  resources: z
    .object({
      vcpu: z.number().positive().nullable().optional(),
      ram_mb: z.number().positive().nullable().optional(),
      disk_gb: z.number().positive().nullable().optional(),
      bandwidth_gb: z.number().positive().nullable().optional(),
      custom: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  sort_order: z.number().optional(),
});

export async function GET() {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment_billing", action: "view", scope: "global" });
    return await withDb(async () => {
      const rows = await DeploymentPackageModel.find({ tenantId: actor.tenantId })
        .sort({ sort_order: 1, name: 1 })
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
    guard(actor, { module: "deployment_billing", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    return await withDb(async () => {
      const doc = await DeploymentPackageModel.create({
        tenantId: actor.tenantId,
        code: b.code,
        name: b.name,
        description: b.description ?? null,
        price_huf: b.price_huf,
        default_cycle: b.default_cycle,
        resources: b.resources ?? {},
        sort_order: b.sort_order ?? 0,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
