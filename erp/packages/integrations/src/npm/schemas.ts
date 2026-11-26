import { z } from "zod";

export const zNpmTokenResponse = z.object({
  token: z.string(),
  expires: z.string().optional(),
});

export const zNpmCertificate = z.object({
  id: z.number(),
  provider: z.string(),
  nice_name: z.string().optional(),
  domain_names: z.array(z.string()),
  expires_on: z.string().nullable().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const zNpmCertificateList = z.array(zNpmCertificate);

export const zNpmProxyHost = z.object({
  id: z.number(),
  domain_names: z.array(z.string()),
  forward_scheme: z.string().optional(),
  forward_host: z.string(),
  forward_port: z.number(),
  certificate_id: z.union([z.number(), z.string()]).nullable().optional(),
  ssl_forced: z.boolean().optional(),
  allow_websocket_upgrade: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const zNpmProxyHostList = z.array(zNpmProxyHost);

export const zNpmHealth = z.object({
  status: z.string().optional(),
  version: z
    .object({ major: z.number(), minor: z.number(), revision: z.number() })
    .optional(),
});
