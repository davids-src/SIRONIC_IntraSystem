import { z } from "zod";

/**
 * Client-side mirror of apps/crm/app/api/deployments/route.ts's createSchema, narrowed to
 * the single-host wizard fields (apps/crm/app/(crm)/deployments/new/page.tsx's "single"
 * mode) — this CLI doesn't implement multi-host creation or raw `external_ids` import.
 * Used only to give `deploy --file` a clear local error before a network round-trip; CRM's
 * own schema is still the real authority and validates again server-side.
 */
export const createDeploymentInputSchema = z.object({
  contact_id: z.string().min(1).nullable().optional(),
  name: z.string().min(1).max(200),
  domain: z
    .string()
    .min(3)
    .max(253)
    .transform((d) => d.toLowerCase()),
  www_redirect: z.boolean().optional(),
  notes: z.string().nullable().optional(),
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
  package_id: z.string().nullable().optional(),
  billing_cycle: z.enum(["monthly", "quarterly", "yearly"]).nullable().optional(),
  price_override_huf: z.number().nonnegative().nullable().optional(),
});
