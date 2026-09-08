import { createHash } from "node:crypto";
import type { Deployment, DeploymentStepKey } from "@crm/types";

/** Per-step "intent" — the subset of the deployment that determines whether a re-execute is a no-op. */
const INTENT_SELECTORS: Record<DeploymentStepKey, (d: Deployment) => unknown> = {
  cloudflare_zone: (d) => ({ domain: d.domain }),
  ns_delegation: (d) => ({ domain: d.domain }),
  dns_records: (d) => ({ domain: d.domain, dns: d.dns, www_redirect: d.www_redirect }),
  ssl_certificate: (d) => ({ domain: d.domain, www_redirect: d.www_redirect }),
  proxy_host: (d) => ({ domain: d.domain, proxy: d.proxy }),
  image_build: (d) => ({ image: d.image }),
  stack_create: (d) => ({ stack: d.stack, image: d.image }),
  stack_deploy: (d) => ({ stack_name: d.stack.stack_name }),
};

/** docs/deployments/04-orchestrator.md §7 — sha256(deployment_id + step_key + canonical_intent_json). */
export function computeIdempotencyKey(
  deployment: Deployment,
  stepKey: DeploymentStepKey,
): string {
  const intent = INTENT_SELECTORS[stepKey](deployment);
  const canonical = JSON.stringify(intent);
  return createHash("sha256")
    .update(`${deployment._id}:${stepKey}:${canonical}`)
    .digest("hex");
}
