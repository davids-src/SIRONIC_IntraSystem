import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DeploymentModel,
  formatNumber,
  nextCounterValue,
  serializeForJson,
} from "@crm/db";
import { DEPLOYMENT_STEP_ORDER } from "@crm/modules";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";

const createSchema = z.object({
  contact_id: z.string().min(1),
  name: z.string().min(1).max(200),
  domain: z
    .string()
    .min(3)
    .max(253)
    .transform((d) => d.toLowerCase()),
  www_redirect: z.boolean().optional(),
  dns: z
    .object({
      record_type: z.enum(["A", "CNAME"]),
      target: z.string().min(1),
      proxied: z.boolean().optional(),
    })
    .optional(),
  proxy: z
    .object({
      forward_host: z.string().min(1),
      forward_port: z.number().int().positive(),
      forward_scheme: z.enum(["http", "https"]).optional(),
      websocket_support: z.boolean().optional(),
    })
    .optional(),
  image: z
    .object({
      repository: z.string().min(1),
      tag: z.string().min(1),
      workflow_id: z.string().nullable().optional(),
      workflow_ref: z.string().optional(),
    })
    .optional(),
  stack: z
    .object({
      stack_name: z
        .string()
        .min(1)
        .regex(/^[a-z0-9-]+$/),
      template_id: z.string().nullable().optional(),
      env: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    })
    .optional(),
  package_id: z.string().nullable().optional(),
  billing_cycle: z.enum(["monthly", "quarterly", "yearly"]).nullable().optional(),
  price_override_huf: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "view", scope: "global" });
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contact_id")?.trim();
    const status = searchParams.get("status")?.trim();
    const q = searchParams.get("q")?.trim();

    return await withDb(async () => {
      const filter: Record<string, unknown> = { tenantId: actor.tenantId };
      if (contactId) filter.contact_id = contactId;
      if (status) filter.status = status;
      if (q) {
        const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = [
          { name: new RegExp(safe, "i") },
          { domain: new RegExp(safe, "i") },
          { deployment_number: new RegExp(safe, "i") },
        ];
      }
      const rows = await DeploymentModel.find(filter).sort({ updated_at: -1 }).lean();
      return NextResponse.json(serializeForJson(rows));
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "write", scope: "global" });
    const json: unknown = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;

    return await withDb(async () => {
      const n = await nextCounterValue(actor.tenantId, "deployment");
      const deployment_number = formatNumber("DEP", n);

      const doc = await DeploymentModel.create({
        tenantId: actor.tenantId,
        contact_id: b.contact_id,
        deployment_number,
        name: b.name,
        domain: b.domain,
        www_redirect: b.www_redirect ?? true,
        status: "draft",
        notes: b.notes ?? null,
        dns: b.dns ?? undefined,
        proxy: b.proxy ?? undefined,
        image: b.image ?? undefined,
        stack: b.stack ?? undefined,
        package_id: b.package_id ?? null,
        billing_cycle: b.billing_cycle ?? null,
        price_override_huf: b.price_override_huf ?? null,
        steps: DEPLOYMENT_STEP_ORDER.map((key) => ({ key, status: "pending" })),
        source: "created",
        created_by: actor.actorId,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
