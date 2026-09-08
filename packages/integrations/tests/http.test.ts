import { httpRequest } from "../src/http";
import { IntegrationError, ProviderHttpError } from "../src/errors";
import { mockFetchSequence } from "./test-utils";

describe("httpRequest", () => {
  it("returns parsed JSON on 2xx", async () => {
    mockFetchSequence([{ status: 200, json: { ok: true } }]);
    const res = await httpRequest("https://example.test/x", { provider: "cloudflare" });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ ok: true });
  });

  it("retries on 429 honoring Retry-After, then succeeds", async () => {
    const fetchMock = mockFetchSequence([
      { status: 429, json: { error: "rate limited" }, headers: { "Retry-After": "0" } },
      { status: 200, json: { ok: true } },
    ]);
    const res = await httpRequest("https://example.test/x", { provider: "cloudflare" });
    expect(res.json).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries on 5xx then throws ProviderHttpError after exhausting attempts", async () => {
    const fetchMock = mockFetchSequence([{ status: 503, json: { error: "down" } }]);
    await expect(
      httpRequest("https://example.test/x", { provider: "portainer" }),
    ).rejects.toBeInstanceOf(ProviderHttpError);
    // 1 initial + 3 retries = 4 attempts
    expect(fetchMock).toHaveBeenCalledTimes(4);
  }, 10_000);

  it("does not retry on 404", async () => {
    const fetchMock = mockFetchSequence([{ status: 404, json: { error: "missing" } }]);
    await expect(
      httpRequest("https://example.test/x", { provider: "npm" }),
    ).rejects.toMatchObject({
      httpStatus: 404,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry on 401", async () => {
    const fetchMock = mockFetchSequence([
      { status: 401, json: { error: "unauthorized" } },
    ]);
    await expect(
      httpRequest("https://example.test/x", { provider: "github" }),
    ).rejects.toBeInstanceOf(IntegrationError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
