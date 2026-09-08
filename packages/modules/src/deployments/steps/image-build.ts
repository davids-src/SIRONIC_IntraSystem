import { OrchestratorError } from "../errors";
import type {
  StepContext,
  StepHandler,
  StepPlan,
  StepResult,
  StepVerifyResult,
} from "../types";
import { github } from "../util";

function requireOwnerRepo(input: Record<string, unknown> | undefined): {
  owner: string;
  repo: string;
} {
  const owner = input?.owner;
  const repo = input?.repo;
  if (typeof owner !== "string" || typeof repo !== "string" || !owner || !repo) {
    throw new OrchestratorError(
      "OWNER_REPO_REQUIRED",
      "Hiányzik a GitHub owner/repo (input.owner, input.repo).",
    );
  }
  return { owner, repo };
}

export const imageBuildStep: StepHandler = {
  key: "image_build",
  dependsOn: [],
  canSkip: true,

  async plan(ctx: StepContext): Promise<StepPlan> {
    const workflow = ctx.deployment.image.workflow_id;
    return {
      summary: workflow
        ? `GitHub Actions workflow indítása: ${workflow} (${ctx.deployment.image.workflow_ref ?? "main"})`
        : "Nincs megadva GitHub workflow — image build kihagyható, ha az image már elérhető a GHCR-en.",
      mutations: workflow
        ? [{ provider: "github", action: "dispatch_workflow", target: workflow }]
        : [],
      warnings: workflow ? [] : ["Nincs workflow_id megadva."],
    };
  },

  async execute(ctx: StepContext, input): Promise<StepResult> {
    const workflowId = ctx.deployment.image.workflow_id;
    if (!workflowId) {
      throw new OrchestratorError(
        "WORKFLOW_MISSING",
        "Nincs megadva GitHub workflow_id.",
      );
    }
    const { owner, repo } = requireOwnerRepo(input);
    const ref = ctx.deployment.image.workflow_ref ?? "main";
    const client = github(ctx);
    const dispatchedAt = ctx.now.getTime();
    await client.dispatchWorkflow(owner, repo, workflowId, ref, undefined);

    const runs = await client.listWorkflowRuns(owner, repo, workflowId, {
      branch: ref,
      perPage: 5,
    });
    const candidate = runs.find((run) => {
      const createdAt = run.created_at ? Date.parse(run.created_at) : 0;
      return createdAt >= dispatchedAt - 5000;
    });
    const run = candidate ?? runs[0];
    if (!run) {
      throw new OrchestratorError(
        "RUN_NOT_FOUND",
        "Nem található futás a workflow indítása után.",
      );
    }
    const finished = await client.waitForRun(owner, repo, run.id);
    if (finished.conclusion !== "success") {
      throw new OrchestratorError(
        "BUILD_FAILED",
        `A GitHub Actions futás sikertelen (${finished.conclusion}).`,
      );
    }
    return {
      status: "done",
      external_id: String(finished.id),
      message: "Image build sikeres.",
      external_ids_patch: { github_last_run_id: finished.id },
    };
  },

  async adopt(_ctx: StepContext, input): Promise<StepResult> {
    const tag = input.external_id;
    const digest = typeof input.digest === "string" ? input.digest : null;
    return {
      status: "adopted",
      external_id: tag,
      message: "Image tag hozzárendelve futtatás nélkül.",
      meta: { adopted_tag: tag },
      external_ids_patch: { image_digest: digest },
      deployment_patch: { "image.tag": tag },
    };
  },

  async verify(ctx: StepContext): Promise<StepVerifyResult> {
    if (!ctx.deployment.image.repository || !ctx.deployment.image.tag) {
      return {
        ok: false,
        drift: ["image_not_set"],
        message: "Nincs megadva image repository/tag.",
      };
    }
    return {
      ok: true,
      drift: [],
      message:
        "Best-effort ellenőrzés: image repository/tag megadva (GHCR digest ellenőrzés nélkül).",
    };
  },
};
