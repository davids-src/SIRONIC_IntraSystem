import { loadConfig } from "../config.js";
import { login } from "../auth/login.js";

export async function loginCommand(): Promise<void> {
  const config = loadConfig();
  const session = await login(config);
  console.log(`Logged in as ${session.email} (tenant ${session.tenantId}).`);
  console.log(`Roles: ${session.roleKeys.join(", ")}`);
}
