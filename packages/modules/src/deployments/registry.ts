import type { DeploymentStepKey } from "@crm/types";
import type { StepHandler } from "./types";
import { cloudflareZoneStep } from "./steps/cloudflare-zone";
import { nsDelegationStep } from "./steps/ns-delegation";
import { dnsRecordsStep } from "./steps/dns-records";
import { sslCertificateStep } from "./steps/ssl-certificate";
import { proxyHostStep } from "./steps/proxy-host";
import { imageBuildStep } from "./steps/image-build";
import { stackCreateStep } from "./steps/stack-create";
import { stackDeployStep } from "./steps/stack-deploy";

/** Pipeline order — also the default step creation order for a new Deployment. */
export const DEPLOYMENT_STEP_ORDER: DeploymentStepKey[] = [
  "cloudflare_zone",
  "ns_delegation",
  "dns_records",
  "ssl_certificate",
  "proxy_host",
  "image_build",
  "stack_create",
  "stack_deploy",
];

export const STEP_REGISTRY: Record<DeploymentStepKey, StepHandler> = {
  cloudflare_zone: cloudflareZoneStep,
  ns_delegation: nsDelegationStep,
  dns_records: dnsRecordsStep,
  ssl_certificate: sslCertificateStep,
  proxy_host: proxyHostStep,
  image_build: imageBuildStep,
  stack_create: stackCreateStep,
  stack_deploy: stackDeployStep,
};

export function getStepHandler(key: DeploymentStepKey): StepHandler {
  return STEP_REGISTRY[key];
}
