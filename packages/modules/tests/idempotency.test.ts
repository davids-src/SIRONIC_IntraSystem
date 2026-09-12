import { computeIdempotencyKey } from "../src/deployments/idempotency";
import type { Deployment } from "@crm/types";

function baseDeployment(overrides: Partial<Deployment> = {}): Deployment {
  return {
    _id: "dep1",
    tenantId: "t1",
    contact_id: "c1",
    deployment_number: "DEP-000001",
    name: "Test",
    domain: "example.com",
    www_redirect: true,
    status: "draft",
    notes: null,
    dns: { name: "@", record_type: "A", target: "1.2.3.4", proxied: false },
    proxy: {
      forward_host: "app",
      forward_port: 3000,
      forward_scheme: "http",
      websocket_support: true,
    },
    image: {
      repository: "ghcr.io/x/y",
      tag: "abc",
      workflow_id: null,
      workflow_ref: null,
    },
    stack: {
      stack_name: "partner-example",
      template_id: "tpl1",
      compose_yaml: null,
      env: [],
    },
    package_id: null,
    billing_cycle: null,
    price_override_huf: null,
    next_billing_at: null,
    last_paid_at: null,
    billing_notes: null,
    steps: [],
    external_ids: {
      cloudflare_zone_id: null,
      cloudflare_dns_record_ids: [],
      npm_certificate_id: null,
      npm_proxy_host_id: null,
      portainer_stack_id: null,
      portainer_endpoint_id: null,
      portainer_webhook_id: null,
      github_last_run_id: null,
      image_digest: null,
    },
    source: "created",
    group_id: null,
    migrated_from_domain_hosting_id: null,
    created_by: "user1",
    archived_at: null,
    archive_reason: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

describe("computeIdempotencyKey", () => {
  it("is stable across calls for unchanged intent", () => {
    const deployment = baseDeployment();
    expect(computeIdempotencyKey(deployment, "dns_records")).toBe(
      computeIdempotencyKey(deployment, "dns_records"),
    );
  });

  it("changes when the relevant intent changes", () => {
    const a = baseDeployment();
    const b = baseDeployment({
      dns: { name: "@", record_type: "A", target: "5.6.7.8", proxied: false },
    });
    expect(computeIdempotencyKey(a, "dns_records")).not.toBe(
      computeIdempotencyKey(b, "dns_records"),
    );
  });

  it("is unaffected by fields outside the step's intent", () => {
    const a = baseDeployment();
    const b = baseDeployment({ notes: "irrelevant change" });
    expect(computeIdempotencyKey(a, "dns_records")).toBe(
      computeIdempotencyKey(b, "dns_records"),
    );
  });

  it("differs per step for the same deployment", () => {
    const deployment = baseDeployment();
    expect(computeIdempotencyKey(deployment, "dns_records")).not.toBe(
      computeIdempotencyKey(deployment, "ssl_certificate"),
    );
  });
});
