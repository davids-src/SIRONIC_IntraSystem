import { GithubClient } from "../src/github/client";
import { IntegrationError } from "../src/errors";
import { mockFetchSequence } from "./test-utils";

const client = new GithubClient({ token: "pat" });

describe("GithubClient", () => {
  it("dispatchWorkflow posts to the dispatches endpoint", async () => {
    const fetchMock = mockFetchSequence([{ status: 204 }]);
    await client.dispatchWorkflow("owner", "repo", "main-build.yml", "main");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("waitForRun polls until status is completed", async () => {
    mockFetchSequence([
      { status: 200, json: { id: 1, status: "in_progress", conclusion: null } },
      { status: 200, json: { id: 1, status: "completed", conclusion: "success" } },
    ]);
    const run = await client.waitForRun("owner", "repo", 1, {
      pollIntervalMs: 10,
      timeoutMs: 5000,
    });
    expect(run.conclusion).toBe("success");
  });

  it("waitForRun times out if the run never completes", async () => {
    mockFetchSequence([
      { status: 200, json: { id: 1, status: "in_progress", conclusion: null } },
    ]);
    await expect(
      client.waitForRun("owner", "repo", 1, { pollIntervalMs: 10, timeoutMs: 30 }),
    ).rejects.toBeInstanceOf(IntegrationError);
  });

  it("listContainerVersions parses package versions", async () => {
    mockFetchSequence([{ status: 200, json: [{ id: 1, name: "sha256:abc" }] }]);
    const versions = await client.listContainerVersions("owner", "pkg");
    expect(versions[0]?.name).toBe("sha256:abc");
  });
});
