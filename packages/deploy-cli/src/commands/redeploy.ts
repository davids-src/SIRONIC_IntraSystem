import { requireSession, loadConfig } from "../auth/session.js";
import { createCrmClient } from "../api/http-client.js";
import { redeploy } from "../api/deployments.js";

export async function redeployCommand(id: string, opts: { tag?: string }): Promise<void> {
  const session = requireSession();
  const config = loadConfig();
  const client = createCrmClient(config, session.access_token);

  const deployment = await redeploy(client, id, opts.tag);
  console.log(`Redeploy indítva: ${deployment.deployment_number} (${deployment.status})`);
  if (opts.tag) console.log(`Új image tag: ${opts.tag}`);
}
