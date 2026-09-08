import { CloudflareClient } from "../src/cloudflare/client";
import { IntegrationError } from "../src/errors";
import { mockFetchSequence } from "./test-utils";

const client = new CloudflareClient({
  baseUrl: "https://api.cloudflare.test/v4",
  apiToken: "tok",
});

describe("CloudflareClient", () => {
  it("createZone returns id/nameServers/status on success", async () => {
    mockFetchSequence([
      {
        status: 200,
        json: {
          success: true,
          errors: [],
          messages: [],
          result: {
            id: "zone1",
            name: "example.com",
            status: "pending",
            name_servers: ["ns1.cf", "ns2.cf"],
          },
        },
      },
    ]);
    const zone = await client.createZone("example.com");
    expect(zone).toEqual({
      id: "zone1",
      nameServers: ["ns1.cf", "ns2.cf"],
      status: "pending",
    });
  });

  it("maps 'zone already exists' (1061) to a ZONE_EXISTS IntegrationError", async () => {
    mockFetchSequence([
      {
        status: 200,
        json: {
          success: false,
          errors: [{ code: 1061, message: "already exists" }],
          messages: [],
          result: null,
        },
      },
    ]);
    await expect(client.createZone("example.com")).rejects.toMatchObject({
      code: "ZONE_EXISTS",
    });
  });

  it("propagates auth errors as non-retryable", async () => {
    mockFetchSequence([
      {
        status: 401,
        json: { success: false, errors: [{ code: 10000, message: "auth" }] },
      },
    ]);
    await expect(client.getZone("zone1")).rejects.toBeInstanceOf(IntegrationError);
  });

  it("listZones parses the result array", async () => {
    mockFetchSequence([
      {
        status: 200,
        json: {
          success: true,
          errors: [],
          messages: [],
          result: [{ id: "z1", name: "a.com", status: "active", name_servers: [] }],
        },
      },
    ]);
    const zones = await client.listZones({ name: "a.com" });
    expect(zones).toHaveLength(1);
    expect(zones[0]?.id).toBe("z1");
  });
});
