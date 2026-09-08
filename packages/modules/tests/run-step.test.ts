import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { connectDb, DeploymentEventModel, DeploymentModel } from "@crm/db";
import type { ActorContext, DeploymentStepKey } from "@crm/types";
import { adoptStep, executeStep, planStep, skipStep } from "../src/deployments/run-step";
import { DEPLOYMENT_STEP_ORDER } from "../src/deployments/registry";
import { OrchestratorError } from "../src/deployments/errors";
import type { StepClients } from "../src/deployments/types";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.SECRETS_ENCRYPTION_KEY = "0".repeat(64);
  await connectDb();
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await DeploymentModel.deleteMany({});
  await DeploymentEventModel.deleteMany({});
});

const TENANT = "tenant-1";
const actor: ActorContext = {
  actorId: "user-1",
  tenantId: TENANT,
  roleKeys: ["crm.staff"],
};
const admin: ActorContext = {
  actorId: "admin-1",
  tenantId: TENANT,
  roleKeys: ["crm.admin"],
};

let domainCounter = 0;

async function createDeployment(): Promise<string> {
  domainCounter += 1;
  const doc = await DeploymentModel.create({
    tenantId: TENANT,
    contact_id: "contact-1",
    deployment_number: `DEP-${String(domainCounter).padStart(6, "0")}`,
    name: "Test deployment",
    domain: `example-${domainCounter}.com`,
    dns: { record_type: "A", target: "1.2.3.4", proxied: false },
    proxy: { forward_host: "app", forward_port: 3000 },
    steps: DEPLOYMENT_STEP_ORDER.map((key) => ({ key, status: "pending" })),
    created_by: "user-1",
  });
  return String(doc._id);
}

function fakeCloudflare(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    listZones: jest.fn().mockResolvedValue([]),
    createZone: jest
      .fn()
      .mockResolvedValue({
        id: "zone-1",
        nameServers: ["ns1.cf", "ns2.cf"],
        status: "pending",
      }),
    getZone: jest
      .fn()
      .mockResolvedValue({
        id: "zone-1",
        name: "example-1.com",
        status: "active",
        name_servers: [],
      }),
    triggerActivationCheck: jest.fn().mockResolvedValue(undefined),
    upsertDnsRecord: jest.fn().mockResolvedValue({ id: "rec-1" }),
    listDnsRecords: jest.fn().mockResolvedValue([]),
    deleteDnsRecord: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

async function events(deploymentId: string) {
  return DeploymentEventModel.find({ deployment_id: deploymentId })
    .sort({ created_at: 1 })
    .lean();
}

describe("planStep (dry-run)", () => {
  it("does not mutate any step and writes a step_plan event", async () => {
    const id = await createDeployment();
    const cf = fakeCloudflare();
    const clients = { cloudflare: cf } as unknown as StepClients;

    const { result } = await planStep({
      tenantId: TENANT,
      deploymentId: id,
      stepKey: "cloudflare_zone",
      actor,
      clients,
    });

    expect(result.summary).toContain("example-");
    expect(cf.createZone).not.toHaveBeenCalled();

    const deployment = await DeploymentModel.findById(id).lean<any>();
    expect(
      deployment?.steps.find((s: { key: string }) => s.key === "cloudflare_zone").status,
    ).toBe("pending");

    const log = await events(id);
    expect(log).toHaveLength(1);
    expect(log[0]?.kind).toBe("step_plan");
  });
});

describe("executeStep", () => {
  it("runs cloudflare_zone and marks it done with external ids", async () => {
    const id = await createDeployment();
    const cf = fakeCloudflare();
    const clients = { cloudflare: cf } as unknown as StepClients;

    const { deployment } = await executeStep({
      tenantId: TENANT,
      deploymentId: id,
      stepKey: "cloudflare_zone",
      actor,
      clients,
    });

    const step = deployment.steps.find((s) => s.key === "cloudflare_zone");
    expect(step?.status).toBe("done");
    expect(step?.external_id).toBe("zone-1");
    expect(deployment.external_ids.cloudflare_zone_id).toBe("zone-1");
    expect(deployment.status).toBe("provisioning");

    const log = await events(id);
    expect(log.map((e) => e.kind)).toEqual(["step_execute_start", "step_execute_ok"]);
  });

  it("blocks a step whose dependency is not ready", async () => {
    const id = await createDeployment();
    const clients = {} as StepClients;

    await expect(
      executeStep({
        tenantId: TENANT,
        deploymentId: id,
        stepKey: "dns_records",
        actor,
        clients,
      }),
    ).rejects.toBeInstanceOf(OrchestratorError);
  });

  it("is idempotent: re-executing an unchanged done step verifies instead of re-mutating", async () => {
    const id = await createDeployment();
    const cf = fakeCloudflare();
    const clients = { cloudflare: cf } as unknown as StepClients;

    await executeStep({
      tenantId: TENANT,
      deploymentId: id,
      stepKey: "cloudflare_zone",
      actor,
      clients,
    });
    expect(cf.createZone).toHaveBeenCalledTimes(1);

    await executeStep({
      tenantId: TENANT,
      deploymentId: id,
      stepKey: "cloudflare_zone",
      actor,
      clients,
    });
    expect(cf.createZone).toHaveBeenCalledTimes(1); // not called again
    expect(cf.getZone).toHaveBeenCalled(); // verify path instead
  });

  it("marks the step failed and records a step_execute_fail event on provider error", async () => {
    const id = await createDeployment();
    const cf = fakeCloudflare({
      createZone: jest.fn().mockRejectedValue(new Error("boom")),
    });
    const clients = { cloudflare: cf } as unknown as StepClients;

    await expect(
      executeStep({
        tenantId: TENANT,
        deploymentId: id,
        stepKey: "cloudflare_zone",
        actor,
        clients,
      }),
    ).rejects.toThrow();

    const deployment = await DeploymentModel.findById(id).lean<any>();
    const step = deployment?.steps.find(
      (s: { key: string }) => s.key === "cloudflare_zone",
    );
    expect(step.status).toBe("failed");

    const log = await events(id);
    expect(log.map((e) => e.kind)).toEqual(["step_execute_start", "step_execute_fail"]);
  });

  it("allows a crm.admin to force past a skipped, unverified dependency", async () => {
    const id = await createDeployment();
    // Fast-forward: skip everything up through ssl_certificate so proxy_host's dependency is "skipped".
    for (const key of [
      "cloudflare_zone",
      "ns_delegation",
      "dns_records",
      "ssl_certificate",
    ] as DeploymentStepKey[]) {
      await skipStep({ tenantId: TENANT, deploymentId: id, stepKey: key, actor });
    }

    await expect(
      executeStep({
        tenantId: TENANT,
        deploymentId: id,
        stepKey: "proxy_host",
        actor,
        clients: {},
      }),
    ).rejects.toBeInstanceOf(OrchestratorError);

    // With force_dependency_override (admin only), it should get past the dependency check and fail later
    // on the missing npm client instead — proving the dependency gate was bypassed.
    await expect(
      executeStep({
        tenantId: TENANT,
        deploymentId: id,
        stepKey: "proxy_host",
        actor: admin,
        clients: {},
        input: { force_dependency_override: true },
      }),
    ).rejects.toMatchObject({ code: "INTEGRATION_MISSING" });
  });
});

describe("adoptStep", () => {
  it("adopts an existing Cloudflare zone and marks the step adopted", async () => {
    const id = await createDeployment();
    const existing = await DeploymentModel.findById(id).lean<any>();
    const domain = existing?.domain as string;
    const cf = fakeCloudflare({
      getZone: jest
        .fn()
        .mockResolvedValue({
          id: "zone-9",
          name: domain,
          status: "active",
          name_servers: [],
        }),
    });
    const clients = { cloudflare: cf } as unknown as StepClients;

    const { deployment: updated } = await adoptStep({
      tenantId: TENANT,
      deploymentId: id,
      stepKey: "cloudflare_zone",
      actor,
      clients,
      externalId: "zone-9",
    });

    const step = updated.steps.find((s) => s.key === "cloudflare_zone");
    expect(step?.status).toBe("adopted");
    expect(updated.external_ids.cloudflare_zone_id).toBe("zone-9");
  });
});
