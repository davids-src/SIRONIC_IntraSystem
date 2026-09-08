import type { z } from "zod";
import type { zNpmCertificate, zNpmProxyHost } from "./schemas";

export type NpmCredentials = { email: string; password: string };

export type NpmCertificate = z.infer<typeof zNpmCertificate>;
export type NpmProxyHost = z.infer<typeof zNpmProxyHost>;

export interface NpmClientConfig {
  baseUrl: string;
  email: string;
  password: string;
}

export interface CreateCertificateInput {
  domainNames: string[];
  dnsProviderCredentials: string; // e.g. "dns_cloudflare_api_token = <token>\n"
  letsencryptEmail: string;
}

export interface CreateProxyHostInput {
  domainNames: string[];
  forwardScheme: "http" | "https";
  forwardHost: string;
  forwardPort: number;
  certificateId: number;
  allowWebsocketUpgrade?: boolean;
  sslForced?: boolean;
}
