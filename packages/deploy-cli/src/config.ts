import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Loopback callback ports the CLI tries in order for the OIDC PKCE redirect. MUST match
 * apps/auth/scripts/register-cli-client.ts's `LOOPBACK_CALLBACK_PORTS` — the /authorize
 * endpoint only accepts a redirect_uri that's an exact match for one already registered on
 * the client, so the two lists have to change together.
 */
export const LOOPBACK_CALLBACK_PORTS = [51739, 51740, 51741];

export interface CliConfig {
  /** apps/auth base URL — the platform OIDC issuer the CLI logs into first. */
  authUrl: string;
  /** apps/crm base URL — where the actual deployment API lives. */
  crmUrl: string;
  /** client_id from `pnpm --filter @crm/auth-app register-cli-client`. */
  clientId: string;
}

export function loadConfig(): CliConfig {
  const authUrl = process.env.SIRONIC_AUTH_URL;
  const crmUrl = process.env.SIRONIC_CRM_URL;
  const clientId = process.env.SIRONIC_CLI_CLIENT_ID;
  const missing = [
    !authUrl && "SIRONIC_AUTH_URL",
    !crmUrl && "SIRONIC_CRM_URL",
    !clientId && "SIRONIC_CLI_CLIENT_ID",
  ].filter((v): v is string => !!v);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. See packages/deploy-cli/README.md.`,
    );
  }
  return {
    authUrl: authUrl!.replace(/\/+$/, ""),
    crmUrl: crmUrl!.replace(/\/+$/, ""),
    clientId: clientId!,
  };
}

const CONFIG_DIR = join(homedir(), ".config", "sironic-deploy-cli");
export const SESSION_FILE = join(CONFIG_DIR, "session.json");
export { CONFIG_DIR };
