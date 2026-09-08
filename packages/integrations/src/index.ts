export { IntegrationError, ProviderHttpError } from "./errors";
export { redact, redactHeaders } from "./redact";
export { httpRequest, type HttpRequestOptions, type HttpResponse } from "./http";

export { CloudflareClient } from "./cloudflare/client";
export type {
  CloudflareClientConfig,
  CloudflareCredentials,
  DnsRecord,
  UpsertDnsRecordInput,
  Zone,
} from "./cloudflare/types";

export { NpmClient, NPM_DOMAIN_REGEX, assertValidNpmDomain } from "./npm/client";
export type {
  CreateCertificateInput,
  CreateProxyHostInput,
  NpmCertificate,
  NpmClientConfig,
  NpmCredentials,
  NpmProxyHost,
} from "./npm/types";

export { PortainerClient } from "./portainer/client";
export type {
  ContainerSummary,
  PortainerClientConfig,
  PortainerCredentials,
  PortainerStack,
  StackEnvVar,
} from "./portainer/types";

export { GithubClient } from "./github/client";
export type {
  GithubClientConfig,
  GithubCredentials,
  GithubPackageVersion,
  GithubRun,
  WaitForRunOptions,
} from "./github/types";
