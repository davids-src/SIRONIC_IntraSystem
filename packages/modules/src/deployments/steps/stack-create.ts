import { StackTemplateModel } from "@crm/db";
import { OrchestratorError } from "../errors";
import type {
  StepContext,
  StepHandler,
  StepPlan,
  StepResult,
  StepVerifyResult,
} from "../types";
import { getStep, portainer } from "../util";

interface RenderedStack {
  compose: string;
  requiredNetworks: string[];
}

async function renderStack(ctx: StepContext): Promise<RenderedStack> {
  const { stack, image, domain } = ctx.deployment;
  if (!stack.stack_name) {
    throw new OrchestratorError(
      "STACK_NAME_MISSING",
      "Nincs megadva Portainer stack neve.",
    );
  }
  if (!stack.template_id) {
    throw new OrchestratorError(
      "TEMPLATE_MISSING",
      "Nincs kiválasztva stack sablon (StackTemplate).",
    );
  }
  const template = await StackTemplateModel.findOne({
    _id: stack.template_id,
    tenantId: ctx.tenantId,
  }).lean<{ compose_yaml: string; required_networks: string[] } | null>();
  if (!template) {
    throw new OrchestratorError(
      "TEMPLATE_NOT_FOUND",
      "A megadott stack sablon nem található.",
    );
  }

  const values: Record<string, string> = {
    STACK_NAME: stack.stack_name,
    IMAGE: image.repository ?? "",
    IMAGE_TAG: image.tag ?? "latest",
    DOMAIN: domain,
  };
  for (const env of stack.env) values[env.name] = env.value;

  const compose = template.compose_yaml.replace(
    /{{\s*([A-Z0-9_]+)\s*}}/g,
    (match, key: string) => (key in values ? (values[key] as string) : match),
  );
  return { compose, requiredNetworks: template.required_networks };
}

export const stackCreateStep: StepHandler = {
  key: "stack_create",
  dependsOn: ["proxy_host", "image_build"],
  canSkip: true,

  async plan(ctx: StepContext): Promise<StepPlan> {
    const stackName = ctx.deployment.stack.stack_name;
    return {
      summary: `Portainer stack létrehozása: ${stackName ?? "(nincs megadva név)"}`,
      mutations: stackName
        ? [{ provider: "portainer", action: "create_stack", target: stackName }]
        : [],
      warnings: ctx.deployment.stack.template_id
        ? []
        : ["Nincs kiválasztva stack sablon."],
    };
  },

  async execute(ctx: StepContext): Promise<StepResult> {
    const { compose } = await renderStack(ctx);
    const client = portainer(ctx);
    const stackName = ctx.deployment.stack.stack_name as string;
    const created = await client.createStackStandalone(
      stackName,
      compose,
      ctx.deployment.stack.env,
    );
    return {
      status: "done",
      external_id: String(created.id),
      message: "Stack létrehozva.",
      external_ids_patch: {
        portainer_stack_id: created.id,
        portainer_webhook_id: created.webhookId ?? null,
      },
    };
  },

  async adopt(ctx: StepContext, input): Promise<StepResult> {
    const client = portainer(ctx);
    const stacks = await client.listStacks();
    const id = Number(input.external_id);
    const match = stacks.find((s) => s.Id === id);
    if (!match) {
      throw new OrchestratorError(
        "STACK_NOT_FOUND",
        "A megadott Portainer stack nem található.",
      );
    }
    return {
      status: "adopted",
      external_id: String(match.Id),
      message: "Meglévő stack hozzárendelve.",
      external_ids_patch: {
        portainer_stack_id: match.Id,
        portainer_webhook_id: match.AutoUpdate?.Webhook ?? null,
      },
    };
  },

  async verify(ctx: StepContext): Promise<StepVerifyResult> {
    const step = getStep(ctx.deployment, "stack_create");
    if (!step.external_id)
      return {
        ok: false,
        drift: ["missing_stack_id"],
        message: "Nincs stack hozzárendelve.",
      };
    const client = portainer(ctx);
    const stacks = await client.listStacks();
    const match = stacks.find((s) => s.Id === Number(step.external_id));
    if (!match)
      return { ok: false, drift: ["stack_not_found"], message: "A stack nem található." };
    const drift: string[] = [];
    if (match.Name !== ctx.deployment.stack.stack_name) drift.push("stack.name_mismatch");
    try {
      const file = await client.getStackFile(match.Id);
      if (!file.includes("nginxproxy_default"))
        drift.push("stack.missing_external_network:nginxproxy_default");
    } catch {
      // best-effort — file retrieval failures don't block verify
    }
    return {
      ok: drift.length === 0,
      drift,
      message: drift.length === 0 ? "Rendben." : "Eltérés található.",
    };
  },
};
