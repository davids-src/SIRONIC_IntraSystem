import type { Deployment, DeploymentStatus } from "@crm/types";
import { STEP_REGISTRY } from "./registry";

/**
 * Derives the deployment-level status from its steps (docs/deployments/04-orchestrator.md §2).
 * "Required" = steps where `canSkip === false`, or the step was not actually skipped.
 */
export function deriveDeploymentStatus(deployment: Deployment): DeploymentStatus {
  if (deployment.status === "archived") return "archived";
  if (deployment.status === "suspended") return "suspended";

  const steps = deployment.steps;
  const anyFailed = steps.some((s) => s.status === "failed");
  const anyDoneOrAdopted = steps.some(
    (s) => s.status === "done" || s.status === "adopted",
  );
  if (anyFailed && anyDoneOrAdopted) return "degraded";

  const allRequiredSatisfied = steps.every((s) => {
    const handler = STEP_REGISTRY[s.key];
    if (s.status === "skipped" && handler.canSkip) return true;
    return s.status === "done" || s.status === "adopted";
  });
  if (allRequiredSatisfied) return "live";

  if (steps.some((s) => s.status === "running" || s.status === "manual_required")) {
    return "provisioning";
  }

  const anyStarted = steps.some((s) => s.status !== "pending");
  return anyStarted ? "provisioning" : "draft";
}
