import type { z } from "zod";
import type { zDnsRecord, zZone } from "./schemas";

export type CloudflareCredentials = { api_token: string };

export type Zone = z.infer<typeof zZone>;
export type DnsRecord = z.infer<typeof zDnsRecord>;

export interface UpsertDnsRecordInput {
  type: "A" | "CNAME";
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
}

export interface CloudflareClientConfig {
  baseUrl: string;
  apiToken: string;
  accountId?: string;
}
