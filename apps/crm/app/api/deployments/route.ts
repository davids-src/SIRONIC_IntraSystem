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
  group_id: z.string().nullable().optional(),
  source: z.enum(["created", "imported"]).optional(),
  dns: z
    .object({
      record_type: z.enum(["A", "CNAME"]),
      name: z.string().optional(),
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
      compose_yaml: z.string().nullable().optional(),
      env: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    })
    .optional(),
  /** Külső azonosítók importáláshoz */
  external_ids: z
    .object({
      cloudflare_zone_id: z.string().nullable().optional(),
      cloudflare_dns_record_ids: z.array(z.string()).optional(),
      npm_certificate_id: z.number().nullable().optional(),
      npm_proxy_host_id: z.number().nullable().optional(),
      portainer_stack_id: z.number().nullable().optional(),
      portainer_endpoint_id: z.number().nullable().optional(),
      portainer_webhook_id: z.string().nullable().optional(),
      github_last_run_id: z.number().nullable().optional(),
      image_digest: z.string().nullable().optional(),
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
      const isImport = b.source === "imported";

      // Ha importálás: lépések adopted/done állapottal ahol van external_id
      const extIds = b.external_ids ?? {};
      const buildStepStatus = (key: string): "pending" | "adopted" => {
        if (!isImport) return "pending";
        const hasId = (() => {
          switch (key) {
            case "cloudflare_zone":
              return !!extIds.cloudflare_zone_id;
            case "dns_records":
              return (extIds.cloudflare_dns_record_ids?.length ?? 0) > 0;
            case "ssl_certificate":
              return !!extIds.npm_certificate_id;
            case "proxy_host":
              return !!extIds.npm_proxy_host_id;
            case "stack_create":
            case "stack_deploy":
              return !!extIds.portainer_stack_id;
            default:
              return false;
          }
        })();
        return hasId ? "adopted" : "pending";
      };

      const doc = await DeploymentModel.create({
        tenantId: actor.tenantId,
        contact_id: b.contact_id,
        deployment_number,
        name: b.name,
        domain: b.domain,
        www_redirect: b.www_redirect ?? true,
        status: isImport ? "live" : "draft",
        notes: b.notes ?? null,
        group_id: b.group_id ?? null,
        dns: b.dns ?? undefined,
        proxy: b.proxy ?? undefined,
        image: b.image ?? undefined,
        stack: b.stack ?? undefined,
        package_id: b.package_id ?? null,
        billing_cycle: b.billing_cycle ?? null,
        price_override_huf: b.price_override_huf ?? null,
        steps: DEPLOYMENT_STEP_ORDER.map((key) => ({
          key,
          status: buildStepStatus(key),
          external_id: (() => {
            if (!isImport) return null;
            switch (key) {
              case "cloudflare_zone":
                return extIds.cloudflare_zone_id ?? null;
              case "ssl_certificate":
                return extIds.npm_certificate_id?.toString() ?? null;
              case "proxy_host":
                return extIds.npm_proxy_host_id?.toString() ?? null;
              case "stack_create":
              case "stack_deploy":
                return extIds.portainer_stack_id?.toString() ?? null;
              default:
                return null;
            }
          })(),
        })),
        external_ids: isImport
          ? {
              cloudflare_zone_id: extIds.cloudflare_zone_id ?? null,
              cloudflare_dns_record_ids: extIds.cloudflare_dns_record_ids ?? [],
              npm_certificate_id: extIds.npm_certificate_id ?? null,
              npm_proxy_host_id: extIds.npm_proxy_host_id ?? null,
              portainer_stack_id: extIds.portainer_stack_id ?? null,
              portainer_endpoint_id: extIds.portainer_endpoint_id ?? null,
              portainer_webhook_id: extIds.portainer_webhook_id ?? null,
              github_last_run_id: extIds.github_last_run_id ?? null,
              image_digest: extIds.image_digest ?? null,
            }
          : undefined,
        source: b.source ?? "created",
        created_by: actor.actorId,
      });
      return NextResponse.json(serializeForJson(doc.toObject()), { status: 201 });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
