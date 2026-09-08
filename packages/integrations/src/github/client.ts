import { httpRequest } from "../http";
import { IntegrationError } from "../errors";
import { zGithubPackageVersionList, zGithubRun, zGithubRunList } from "./schemas";
import type {
  GithubClientConfig,
  GithubPackageVersion,
  GithubRun,
  WaitForRunOptions,
} from "./types";

const DEFAULT_BASE_URL = "https://api.github.com";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GithubClient {
  constructor(private readonly config: GithubClientConfig) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };
  }

  private url(path: string): string {
    return `${(this.config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "")}${path}`;
  }

  /** Healthcheck probe (docs/deployments/03-integrations.md §6). */
  async getRateLimit(): Promise<{ ok: boolean }> {
    const res = await httpRequest(this.url("/rate_limit"), {
      provider: "github",
      headers: this.headers(),
    });
    return { ok: res.status === 200 };
  }

  async dispatchWorkflow(
    owner: string,
    repo: string,
    workflowId: string,
    ref = "main",
    inputs?: Record<string, string>,
  ): Promise<void> {
    await httpRequest(
      this.url(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`),
      {
        provider: "github",
        method: "POST",
        headers: this.headers(),
        body: { ref, ...(inputs ? { inputs } : {}) },
        retry: false,
      },
    );
  }

  async listWorkflowRuns(
    owner: string,
    repo: string,
    workflowId: string,
    opts: { perPage?: number; branch?: string } = {},
  ): Promise<GithubRun[]> {
    const params = new URLSearchParams({ per_page: String(opts.perPage ?? 5) });
    if (opts.branch) params.set("branch", opts.branch);
    const res = await httpRequest(
      this.url(
        `/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?${params.toString()}`,
      ),
      { provider: "github", headers: this.headers() },
    );
    return zGithubRunList.parse(res.json).workflow_runs;
  }

  async getWorkflowRun(owner: string, repo: string, runId: number): Promise<GithubRun> {
    const res = await httpRequest(
      this.url(`/repos/${owner}/${repo}/actions/runs/${runId}`),
      {
        provider: "github",
        headers: this.headers(),
      },
    );
    return zGithubRun.parse(res.json);
  }

  /** Polls until the run completes or `timeoutMs` elapses (default 30 minutes). */
  async waitForRun(
    owner: string,
    repo: string,
    runId: number,
    opts: WaitForRunOptions = {},
  ): Promise<GithubRun> {
    const timeoutMs = opts.timeoutMs ?? 30 * 60_000;
    const pollIntervalMs = opts.pollIntervalMs ?? 10_000;
    const deadline = Date.now() + timeoutMs;

    for (;;) {
      const run = await this.getWorkflowRun(owner, repo, runId);
      if (run.status === "completed") return run;
      if (Date.now() > deadline) {
        throw new IntegrationError(
          "github",
          "RUN_TIMEOUT",
          "A GitHub Actions futás nem fejeződött be az időkorláton belül.",
          undefined,
          false,
        );
      }
      await sleep(pollIntervalMs);
    }
  }

  async listContainerVersions(
    owner: string,
    packageName: string,
  ): Promise<GithubPackageVersion[]> {
    const res = await httpRequest(
      this.url(
        `/orgs/${owner}/packages/container/${encodeURIComponent(packageName)}/versions`,
      ),
      { provider: "github", headers: this.headers() },
    );
    return zGithubPackageVersionList.parse(res.json);
  }
}
