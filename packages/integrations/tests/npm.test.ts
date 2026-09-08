import { NpmClient, assertValidNpmDomain } from "../src/npm/client";
import { IntegrationError } from "../src/errors";
import { mockFetchSequence } from "./test-utils";

describe("NpmClient", () => {
  it("logs in and creates a certificate", async () => {
    const client = new NpmClient({
      baseUrl: "https://npm.test:81",
      email: "a@b.com",
      password: "pw",
    });
    mockFetchSequence([
      { status: 200, json: { token: "jwt-token" } },
      {
        status: 201,
        json: { id: 12, provider: "letsencrypt", domain_names: ["example.com"] },
      },
    ]);
    const cert = await client.createCertificate({
      domainNames: ["example.com"],
      dnsProviderCredentials: "dns_cloudflare_api_token = xyz\n",
      letsencryptEmail: "ops@sironic.eu",
    });
    expect(cert).toEqual({ id: 12 });
  });

  it("rejects domains with shell-metacharacters before calling the API", async () => {
    const client = new NpmClient({
      baseUrl: "https://npm.test:81",
      email: "a@b.com",
      password: "pw",
    });
    await expect(
      client.createCertificate({
        domainNames: ["example.com; rm -rf /"],
        dnsProviderCredentials: "x",
        letsencryptEmail: "ops@sironic.eu",
      }),
    ).rejects.toBeInstanceOf(IntegrationError);
  });

  it("assertMinVersion rejects an NPM instance older than the CVE-2024-39935 fix", async () => {
    const client = new NpmClient({
      baseUrl: "https://npm.test:81",
      email: "a@b.com",
      password: "pw",
    });
    mockFetchSequence([
      {
        status: 200,
        json: { status: "OK", version: { major: 2, minor: 10, revision: 0 } },
      },
    ]);
    await expect(client.assertMinVersion("2.11.3")).rejects.toMatchObject({
      code: "VERSION_TOO_OLD",
    });
  });

  it("assertMinVersion passes for a compliant version", async () => {
    const client = new NpmClient({
      baseUrl: "https://npm.test:81",
      email: "a@b.com",
      password: "pw",
    });
    mockFetchSequence([
      {
        status: 200,
        json: { status: "OK", version: { major: 2, minor: 11, revision: 3 } },
      },
    ]);
    await expect(client.assertMinVersion("2.11.3")).resolves.toBeUndefined();
  });

  it("domain regex accepts normal domains", () => {
    expect(() => assertValidNpmDomain("sub.example.com")).not.toThrow();
  });
});
