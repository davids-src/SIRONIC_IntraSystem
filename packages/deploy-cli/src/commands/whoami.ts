import { requireSession } from "../auth/session.js";

export function whoamiCommand(): void {
  const session = requireSession();
  console.log(`${session.email} (tenant ${session.tenantId})`);
  console.log(`Roles: ${session.roleKeys.join(", ")}`);
}
