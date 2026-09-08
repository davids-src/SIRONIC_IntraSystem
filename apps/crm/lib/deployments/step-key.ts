import { DEPLOYMENT_STEP_ORDER } from "@crm/modules";
import type { DeploymentStepKey } from "@crm/types";
import { HttpError } from "@/lib/api-helpers";

export function assertStepKey(key: string): DeploymentStepKey {
  if (!DEPLOYMENT_STEP_ORDER.includes(key as DeploymentStepKey)) {
    throw new HttpError(400, `Ismeretlen lépés: ${key}`);
  }
  return key as DeploymentStepKey;
}
