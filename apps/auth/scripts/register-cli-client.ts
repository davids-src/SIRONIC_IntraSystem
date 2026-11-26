/**
 * One-off bootstrap for the `sironic-deploy` CLI (packages/deploy-cli): registers it as a
 * public OIDC client (PKCE, no secret) so it can run the same authorization_code + PKCE
 * flow apps/auth already serves — no change to the OIDC endpoints themselves was needed,
 * only this registration and verifyIssuedToken()'s secondary-connection support (see
 * packages/auth-core/src/oidc-keys.ts).
 *
 * Run once per environment, from anywhere with AUTH_MONGODB_URI set to the real
 * `sironic_auth` connection string:
 *
 *   pnpm --filter @crm/auth-app register-cli-client
 *
 * Idempotent by name — safe to re-run; it reuses the existing client_id instead of
 * creating a duplicate. Prints the client_id to configure as CLI_OIDC_CLIENT_ID in
 * apps/crm's env and as SIRONIC_CLI_CLIENT_ID for CLI operators.
 *
 * The redirect URIs below MUST match packages/deploy-cli/src/config.ts's
 * `LOOPBACK_CALLBACK_PORTS` — the CLI tries them in order and the OIDC /authorize endpoint
 * only accepts an exact match, so the two lists have to be changed together.
 */
import { connectAuthDb, OidcClientModel, createOidcClient } from "@crm/auth-core/server";

const CLIENT_NAME = "Sironic Deploy CLI";
const LOOPBACK_CALLBACK_PORTS = [51739, 51740, 51741];
const REDIRECT_URIS = LOOPBACK_CALLBACK_PORTS.map(
  (port) => `http://127.0.0.1:${port}/callback`,
);

async function main() {
  await connectAuthDb();

  const existing = await OidcClientModel.findOne({
    name: CLIENT_NAME,
    type: "other",
  }).lean<{
    client_id: string;
    redirect_uris: string[];
  }>();
  if (existing) {
    console.log(`Already registered. client_id=${existing.client_id}`);
    if (JSON.stringify(existing.redirect_uris) !== JSON.stringify(REDIRECT_URIS)) {
      console.warn(
        "Registered redirect_uris differ from this script's current list — update manually " +
          "via updateOidcClientRedirectUris() if the CLI's callback ports changed.",
      );
    }
    return;
  }

  const { client_id } = await createOidcClient({
    name: CLIENT_NAME,
    type: "other",
    redirectUris: REDIRECT_URIS,
    confidential: false, // public client: PKCE only, no secret to leak
  });
  console.log(`Registered. client_id=${client_id}`);
  console.log("Set this as CLI_OIDC_CLIENT_ID in apps/crm's env, and as");
  console.log(
    "SIRONIC_CLI_CLIENT_ID for CLI operators (see packages/deploy-cli/README.md).",
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
