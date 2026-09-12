import { deriveDeploymentStatus } from "../src/deployments/status";
import { DEPLOYMENT_STEP_ORDER } from "../src/deployments/registry";
import type { Deployment, DeploymentStep, DeploymentStepStatus } from "@crm/types";

function makeSteps(
  statuses: Partial<Record<string, DeploymentStepStatus>>,
): DeploymentStep[] {
  return DEPLOYMENT_STEP_ORDER.map((key) => ({
    key,
    status: statuses[key] ?? "pending",
    external_id: null,
    message: null,
    last_error: null,
    started_at: null,
    finished_at: null,
    meta: null,
  }));
}

function makeDeployment(
  status: Deployment["status"],
  steps: DeploymentStep[],
): Deployment {
  return {
    _id: "dep1",
    tenantId: "t1",
    contact_id: "c1",
    deployment_number: "DEP-000001",
    name: "Test",
    domain: "example.com",
    www_redirect: true,
    status,
    notes: null,
    dns: { name: "@", record_type: "A", target: null, proxied: false },
    proxy: {
      forward_host: null,
      forward_port: null,
      forward_scheme: "http",
      websocket_support: true,
    },
    image: { repository: null, tag: null, workflow_id: null, workflow_ref: null },
    stack: { stack_name: null, template_id: null, compose_yaml: null, env: [] },
    package_id: null,
    billing_cycle: null,
    price_override_huf: null,
    next_billing_at: null,
    last_paid_at: null,
    billing_notes: null,
    steps,
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
  };
}

describe("deriveDeploymentStatus", () => {
  it("is draft when nothing has started", () => {
    const deployment = makeDeployment("draft", makeSteps({}));
    expect(deriveDeploymentStatus(deployment)).toBe("draft");
  });

  it("is provisioning once a step is running", () => {
    const deployment = makeDeployment("draft", makeSteps({ cloudflare_zone: "running" }));
    expect(deriveDeploymentStatus(deployment)).toBe("provisioning");
  });

  it("is provisioning when a step needs manual action", () => {
    const deployment = makeDeployment(
      "draft",
      makeSteps({ ns_delegation: "manual_required" }),
    );
    expect(deriveDeploymentStatus(deployment)).toBe("provisioning");
  });

  it("is degraded when a step failed after others succeeded", () => {
    const deployment = makeDeployment(
      "provisioning",
      makeSteps({ cloudflare_zone: "done", ns_delegation: "failed" }),
    );
    expect(deriveDeploymentStatus(deployment)).toBe("degraded");
  });

  it("is live once all required steps are done/adopted/skipped", () => {
    const deployment = makeDeployment(
      "provisioning",
      makeSteps({
        cloudflare_zone: "done",
        ns_delegation: "done",
        dns_records: "done",
        ssl_certificate: "skipped",
        proxy_host: "done",
        image_build: "skipped",
        stack_create: "adopted",
        stack_deploy: "done",
      }),
    );
    expect(deriveDeploymentStatus(deployment)).toBe("live");
  });

  it("keeps archived/suspended regardless of step state", () => {
    expect(deriveDeploymentStatus(makeDeployment("archived", makeSteps({})))).toBe(
      "archived",
    );
    expect(deriveDeploymentStatus(makeDeployment("suspended", makeSteps({})))).toBe(
      "suspended",
    );
  });
});
