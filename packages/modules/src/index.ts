import { hasPermission } from "@crm/rbac";
import type { ActorContext, PermissionCheck } from "@crm/types";

export class ForbiddenError extends Error {
  override readonly name = "ForbiddenError";

  constructor(message = "Forbidden") {
    super(message);
  }
}

export function authorizeOrThrow(actor: ActorContext, permission: PermissionCheck): void {
  if (!hasPermission(actor, permission)) {
    throw new ForbiddenError();
  }
}

// Pricing Engine exports
export { mapContactToMultiplierKey } from "./pricing/mapContactToMultiplierKey";
export { calculateServicePrice } from "./pricing/calculateServicePrice";
export { checkAndSeedServiceCategories } from "./pricing/checkAndSeedServiceCategories";
