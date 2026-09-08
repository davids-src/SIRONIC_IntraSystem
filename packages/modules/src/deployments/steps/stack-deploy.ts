import { OrchestratorError } from "../errors";
import type {
  StepContext,
  StepHandler,
  StepPlan,
  StepResult,
  StepVerifyResult,
} from "../types";
import { getStep, portainer } from "../util";

function stackId(ctx: StepContext): number {
  const stackStep = getStep(ctx.deployment, "stack_create");
  if (!stackStep.external_id) {
    throw new OrchestratorError(
      "STACK_NOT_READY",
      "A stack_create lépés még nincs kész.",
    );
  }
  return Number(stackStep.external_id);
}

export const stackDeployStep: StepHandler = {
  key: "stack_deploy",
  dependsOn: ["stack_create"],
  canSkip: false,

  async plan(ctx: StepContext): Promise<StepPlan> {
    const webhookId = ctx.deployment.external_ids.portainer_webhook_id;
    return {
      summary: webhookId
        ? "Stack újraindítása webhook triggerrel."
        : "Stack elindítása/frissítése.",
      mutations: [
        {
          provider: "portainer",
          action: webhookId ? "trigger_webhook" : "start_stack",
          target: ctx.deployment.stack.stack_name ?? "",
        },
      ],
      warnings: [],
    };
  },

  async execute(ctx: StepContext, input): Promise<StepResult> {
    const client = portainer(ctx);
    const webhookId = ctx.deployment.external_ids.portainer_webhook_id;
    const useWebhook = webhookId && input?.trigger_webhook !== false;
    if (useWebhook) {
      await client.triggerWebhook(webhookId);
    } else {
      await client.startStack(stackId(ctx));
    }
    return { status: "done", message: "Stack elindítva." };
  },

  async adopt(ctx: StepContext): Promise<StepResult> {
    const client = portainer(ctx);
    const stackName = ctx.deployment.stack.stack_name;
    const containers = await client.listContainers();
    const running = containers.some(
      (c) =>
        c.State === "running" && c.Names.some((name) => name.includes(stackName ?? "\0")),
    );
    if (!running) {
      throw new OrchestratorError(
        "NO_RUNNING_CONTAINER",
        "Nincs futó konténer ehhez a stackhez.",
      );
    }
    return { status: "adopted", message: "Futó stack hozzárendelve." };
  },

  async verify(ctx: StepContext): Promise<StepVerifyResult> {
    const client = portainer(ctx);
    const stackName = ctx.deployment.stack.stack_name;
    const containers = await client.listContainers();
    const running = containers.some(
      (c) =>
        c.State === "running" && c.Names.some((name) => name.includes(stackName ?? "\0")),
    );
    return {
      ok: running,
      drift: running ? [] : ["stack.no_running_container"],
      message: running ? "Legalább egy konténer fut." : "Nincs futó konténer.",
    };
  },
};
