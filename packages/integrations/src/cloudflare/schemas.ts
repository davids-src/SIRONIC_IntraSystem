import { z } from "zod";

export const zCfError = z.object({
  code: z.number(),
  message: z.string(),
});

export const zCfEnvelopeBase = z.object({
  success: z.boolean(),
  errors: z.array(zCfError).default([]),
  messages: z.array(z.unknown()).default([]),
  result: z.unknown().nullable().optional(),
});

export function zCfEnvelope<T extends z.ZodTypeAny>(result: T) {
  return z.object({
    success: z.boolean(),
    errors: z.array(zCfError).default([]),
    messages: z.array(z.unknown()).default([]),
    result: result.nullable(),
    result_info: z
      .object({
        page: z.number().optional(),
        per_page: z.number().optional(),
        total_count: z.number().optional(),
      })
      .optional(),
  });
}

export const zZone = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  name_servers: z.array(z.string()).default([]),
});

export const zZoneListResult = z.array(zZone);

export const zDnsRecord = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  content: z.string(),
  ttl: z.number().optional(),
  proxied: z.boolean().optional(),
});

export const zDnsRecordListResult = z.array(zDnsRecord);
