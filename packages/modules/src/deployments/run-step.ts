import { DeploymentEventModel, DeploymentModel } from "@crm/db";
import { IntegrationError, redact } from "@crm/integrations";
import type {
  ActorContext,
  Deployment,
  DeploymentEventKind,
  DeploymentStepKey,
  IntegrationConnection,
  IntegrationProvider,
} from "@crm/types";
import { OrchestratorError } from "./errors";
import { computeIdempotencyKey } from "./idempotency";
import { DEPLOYMENT_STEP_ORDER, STEP_REGISTRY } from "./registry";
import { deriveDeploymentStatus } from "./status";
import type {
  StepClients,
  StepContext,
  StepPlan,
  StepResult,
  StepVerifyResult,
} from "./types";
import { getStep } from "./util";

export interface RunStepParams {
  tenantId: string;
  deploymentId: string;
  stepKey: DeploymentStepKey;
  actor: ActorContext;
  actorType?: "crm_user" | "portal_user" | "system" | "webhook";
  clients?: StepClients;
  connections?: Partial<Record<IntegrationProvider, IntegrationConnection>>;
  input?: Record<string, unknown>;
}

export interface StepOutcome<T> {
  deployment: Deployment;
  result: T;
}

async function loadDeployment(
  tenantId: string,
  deploymentId: string,
): Promise<Deployment> {
  const doc = await DeploymentModel.findOne({ _id: deploymentId, tenantId }).lean();
  if (!doc) {
    throw new OrchestratorError("DEPLOYMENT_NOT_FOUND", "A deployment nem található.");
  }
  return doc as unknown as Deployment;
}

function buildContext(params: RunStepParams, deployment: Deployment): StepContext {
  return {
    tenantId: params.tenantId,
    deployment,
    actor: params.actor,
    clients: params.clients ?? {},
    connections: params.connections ?? {},
    now: new Date(),
  };
}

async function emitEvent(params: {
  tenantId: string;
  deploymentId: string;
  stepKey: DeploymentStepKey | null;
  kind: DeploymentEventKind;
  actor: ActorContext;
  actorType: "crm_user" | "portal_user" | "system" | "webhook";
  message: string;
  detail?: unknown;
  durationMs?: number | null;
}): Promise<void> {
  await DeploymentEventModel.create({
    tenantId: params.tenantId,
    deployment_id: params.deploymentId,
    step_key: params.stepKey,
    kind: params.kind,
    actor_id: params.actor.actorId,
    actor_type: params.actorType,
    message: params.message,
    detail: params.detail !== undefined ? redact(params.detail) : null,
    duration_ms: params.durationMs ?? null,
  });
}

async function recomputeStatus(
  tenantId: string,
  deploymentId: string,
): Promise<Deployment> {
  const deployment = await loadDeployment(tenantId, deploymentId);
  const nextStatus = deriveDeploymentStatus(deployment);
  if (nextStatus !== deployment.status) {
    await DeploymentModel.updateOne(
      { _id: deploymentId, tenantId },
      { $set: { status: nextStatus } },
    );
    deployment.status = nextStatus;
  }
  return deployment;
}

async function ensureDependenciesSatisfied(
  ctx: StepContext,
  key: DeploymentStepKey,
  forceOverride: boolean,
): Promise<void> {
  const handler = STEP_REGISTRY[key];
  for (const dep of handler.dependsOn) {
    const depStep = getStep(ctx.deployment, dep);
    if (depStep.status === "done" || depStep.status === "adopted") continue;

    if (key === "stack_create" && dep === "image_build" && depStep.status === "skipped") {
      const resolved = Boolean(
        ctx.deployment.image.repository && ctx.deployment.image.tag,
      );
      if (resolved) continue;
    }

    if (depStep.status === "skipped") {
      if (forceOverride) continue;
      const verifyResult = await STEP_REGISTRY[dep].verify(ctx);
      if (verifyResult.ok) continue;
      throw new OrchestratorError(
        "DEPENDENCY_SKIPPED_UNVERIFIED",
        `A(z) "${dep}" függő lépés ki van hagyva, és a verify sikertelen — force_dependency_override (crm.admin) szükséges.`,
      );
    }

    throw new OrchestratorError(
      "DEPENDENCY_NOT_READY",
      `A(z) "${dep}" függő lépés még nincs kész (jelenlegi státusz: ${depStep.status}).`,
    );
  }
}

/** `{ dry_run: true }` — plan only, no provider mutation, no step-status change. P1 acceptance bar. */
export async function planStep(params: RunStepParams): Promise<StepOutcome<StepPlan>> {
  const deployment = await loadDeployment(params.tenantId, params.deploymentId);
  const ctx = buildContext(params, deployment);
  const handler = STEP_REGISTRY[params.stepKey];
  const plan = await handler.plan(ctx, params.input);
  await emitEvent({
    tenantId: params.tenantId,
    deploymentId: params.deploymentId,
    stepKey: params.stepKey,
    kind: "step_plan",
    actor: params.actor,
    actorType: params.actorType ?? "crm_user",
    message: plan.summary,
    detail: plan,
  });
  return { deployment, result: plan };
}

export async function executeStep(
  params: RunStepParams & { force?: boolean; dryRun?: boolean },
): Promise<StepOutcome<StepResult | StepPlan>> {
  if (params.dryRun) {
    return planStep(params);
  }

  const actorType = params.actorType ?? "crm_user";
  let deployment = await loadDeployment(params.tenantId, params.deploymentId);
  const step = getStep(deployment, params.stepKey);
  const isAdmin = params.actor.roleKeys.includes("crm.admin");
  const forceOverride = Boolean(params.input?.force_dependency_override) && isAdmin;

  let ctx = buildContext(params, deployment);
  await ensureDependenciesSatisfied(ctx, params.stepKey, forceOverride);

  const handler = STEP_REGISTRY[params.stepKey];
  const idempotencyKey = computeIdempotencyKey(deployment, params.stepKey);

  // Idempotent no-op: already done/adopted with an unchanged intent and no explicit force → verify-only.
  if (
    !params.force &&
    (step.status === "done" || step.status === "adopted") &&
    step.meta?.idempotency_key === idempotencyKey
  ) {
    const verifyResult = await handler.verify(ctx);
    return {
      deployment,
      result: {
        status: step.status,
        message: verifyResult.message,
        meta: step.meta ?? {},
      },
    };
  }

  const guarded = await DeploymentModel.updateOne(
    {
      _id: params.deploymentId,
      tenantId: params.tenantId,
      "steps.key": params.stepKey,
      "steps.status": { $ne: "running" },
    },
    {
      $set: {
        "steps.$.status": "running",
        "steps.$.started_at": ctx.now,
        "steps.$.last_error": null,
      },
    },
  );
  if (guarded.matchedCount === 0) {
    throw new OrchestratorError(
      "STEP_ALREADY_RUNNING",
      "Ez a lépés éppen fut egy másik kérésben.",
    );
  }

  await emitEvent({
    tenantId: params.tenantId,
    deploymentId: params.deploymentId,
    stepKey: params.stepKey,
    kind: "step_execute_start",
    actor: params.actor,
    actorType,
    message: `"${params.stepKey}" végrehajtása elindult.`,
  });

  const startedAt = Date.now();
  try {
    deployment = await loadDeployment(params.tenantId, params.deploymentId);
    ctx = buildContext(params, deployment);
    const result = await handler.execute(ctx, params.input);

    const setOps: Record<string, unknown> = {
      "steps.$.status": result.status,
      "steps.$.finished_at": new Date(),
      "steps.$.message": result.message ?? null,
      "steps.$.last_error": null,
      "steps.$.meta": { ...(result.meta ?? {}), idempotency_key: idempotencyKey },
    };
    if (result.external_id !== undefined)
      setOps["steps.$.external_id"] = result.external_id;
    if (result.external_ids_patch) {
      for (const [k, v] of Object.entries(result.external_ids_patch))
        setOps[`external_ids.${k}`] = v;
    }
    if (result.deployment_patch) {
      for (const [k, v] of Object.entries(result.deployment_patch)) setOps[k] = v;
    }
    await DeploymentModel.updateOne(
      {
        _id: params.deploymentId,
        tenantId: params.tenantId,
        "steps.key": params.stepKey,
      },
      { $set: setOps },
    );

    await emitEvent({
      tenantId: params.tenantId,
      deploymentId: params.deploymentId,
      stepKey: params.stepKey,
      kind: "step_execute_ok",
      actor: params.actor,
      actorType,
      message: result.message ?? `"${params.stepKey}" sikeresen lefutott.`,
      detail: result,
      durationMs: Date.now() - startedAt,
    });

    const updated = await recomputeStatus(params.tenantId, params.deploymentId);
    return { deployment: updated, result };
  } catch (err) {
    const message =
      err instanceof IntegrationError || err instanceof OrchestratorError
        ? err.message
        : "Ismeretlen hiba történt a lépés végrehajtása közben.";
    await DeploymentModel.updateOne(
      {
        _id: params.deploymentId,
        tenantId: params.tenantId,
        "steps.key": params.stepKey,
      },
      {
        $set: {
          "steps.$.status": "failed",
          "steps.$.finished_at": new Date(),
          "steps.$.last_error": message,
        },
      },
    );
    await emitEvent({
      tenantId: params.tenantId,
      deploymentId: params.deploymentId,
      stepKey: params.stepKey,
      kind: "step_execute_fail",
      actor: params.actor,
      actorType,
      message,
      detail:
        err instanceof Error
          ? { name: err.name, message: err.message }
          : { error: String(err) },
      durationMs: Date.now() - startedAt,
    });
    await recomputeStatus(params.tenantId, params.deploymentId);
    throw err;
  }
}

export async function adoptStep(
  params: RunStepParams & { externalId: string },
): Promise<StepOutcome<StepResult>> {
  const deployment = await loadDeployment(params.tenantId, params.deploymentId);
  const ctx = buildContext(params, deployment);
  const handler = STEP_REGISTRY[params.stepKey];
  const result = await handler.adopt(ctx, {
    ...params.input,
    external_id: params.externalId,
  });

  const setOps: Record<string, unknown> = {
    "steps.$.status": result.status,
    "steps.$.finished_at": new Date(),
    "steps.$.message": result.message ?? null,
    "steps.$.last_error": null,
  };
  if (result.external_id !== undefined)
    setOps["steps.$.external_id"] = result.external_id;
  if (result.meta) setOps["steps.$.meta"] = result.meta;
  if (result.external_ids_patch) {
    for (const [k, v] of Object.entries(result.external_ids_patch))
      setOps[`external_ids.${k}`] = v;
  }
  if (result.deployment_patch) {
    for (const [k, v] of Object.entries(result.deployment_patch)) setOps[k] = v;
  }
  await DeploymentModel.updateOne(
    { _id: params.deploymentId, tenantId: params.tenantId, "steps.key": params.stepKey },
    { $set: setOps },
  );
  await emitEvent({
    tenantId: params.tenantId,
    deploymentId: params.deploymentId,
    stepKey: params.stepKey,
    kind: "step_adopt",
    actor: params.actor,
    actorType: params.actorType ?? "crm_user",
    message: result.message ?? "Erőforrás adoptálva.",
    detail: result,
  });
  const updated = await recomputeStatus(params.tenantId, params.deploymentId);
  return { deployment: updated, result };
}

export async function verifyStep(
  params: RunStepParams,
): Promise<StepOutcome<StepVerifyResult>> {
  const deployment = await loadDeployment(params.tenantId, params.deploymentId);
  const ctx = buildContext(params, deployment);
  const step = getStep(deployment, params.stepKey);
  const handler = STEP_REGISTRY[params.stepKey];
  const result = await handler.verify(ctx);

  // State diagram: manual_required --verify ok--> done.
  if (result.ok && step.status === "manual_required") {
    await DeploymentModel.updateOne(
      {
        _id: params.deploymentId,
        tenantId: params.tenantId,
        "steps.key": params.stepKey,
      },
      {
        $set: {
          "steps.$.status": "done",
          "steps.$.finished_at": new Date(),
          "steps.$.message": result.message,
        },
      },
    );
  }

  await emitEvent({
    tenantId: params.tenantId,
    deploymentId: params.deploymentId,
    stepKey: params.stepKey,
    kind: "step_verify",
    actor: params.actor,
    actorType: params.actorType ?? "crm_user",
    message: result.message,
    detail: result,
  });
  const updated = await recomputeStatus(params.tenantId, params.deploymentId);
  return { deployment: updated, result };
}

export async function skipStep(
  params: RunStepParams & { reason?: string },
): Promise<StepOutcome<{ ok: true }>> {
  const handler = STEP_REGISTRY[params.stepKey];
  if (!handler.canSkip) {
    throw new OrchestratorError(
      "STEP_NOT_SKIPPABLE",
      `A(z) "${params.stepKey}" lépés nem hagyható ki.`,
    );
  }
  await DeploymentModel.updateOne(
    { _id: params.deploymentId, tenantId: params.tenantId, "steps.key": params.stepKey },
    {
      $set: {
        "steps.$.status": "skipped",
        "steps.$.message": params.reason ?? null,
        "steps.$.finished_at": new Date(),
      },
    },
  );
  await emitEvent({
    tenantId: params.tenantId,
    deploymentId: params.deploymentId,
    stepKey: params.stepKey,
    kind: "step_skip",
    actor: params.actor,
    actorType: params.actorType ?? "crm_user",
    message: params.reason ?? `"${params.stepKey}" kihagyva.`,
  });
  const deployment = await recomputeStatus(params.tenantId, params.deploymentId);
  return { deployment, result: { ok: true } };
}

export async function unskipStep(
  params: RunStepParams,
): Promise<StepOutcome<{ ok: true }>> {
  await DeploymentModel.updateOne(
    {
      _id: params.deploymentId,
      tenantId: params.tenantId,
      "steps.key": params.stepKey,
      "steps.status": "skipped",
    },
    {
      $set: {
        "steps.$.status": "pending",
        "steps.$.message": null,
        "steps.$.finished_at": null,
      },
    },
  );
  const deployment = await recomputeStatus(params.tenantId, params.deploymentId);
  return { deployment, result: { ok: true } };
}

/** Runs the next pending/failed executable steps in dependency order until blocked or `maxSteps` reached. */
export async function runNextSteps(
  params: Omit<RunStepParams, "stepKey" | "input"> & { maxSteps?: number },
): Promise<StepOutcome<{ ran: DeploymentStepKey[]; blocked: DeploymentStepKey | null }>> {
  const maxSteps = params.maxSteps ?? DEPLOYMENT_STEP_ORDER.length;
  const ran: DeploymentStepKey[] = [];
  let blocked: DeploymentStepKey | null = null;
  let deployment = await loadDeployment(params.tenantId, params.deploymentId);

  for (const key of DEPLOYMENT_STEP_ORDER) {
    if (ran.length >= maxSteps) break;
    const step = getStep(deployment, key);
    if (step.status !== "pending" && step.status !== "failed") continue;

    try {
      const outcome = await executeStep({ ...params, stepKey: key });
      deployment = outcome.deployment;
      ran.push(key);
    } catch {
      blocked = key;
      break;
    }
  }

  return { deployment, result: { ran, blocked } };
}
