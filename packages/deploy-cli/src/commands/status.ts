import { requireSession, loadConfig } from "../auth/session.js";
import { createCrmClient } from "../api/http-client.js";
import { getDeployment, listDeployments } from "../api/deployments.js";
import type { Deployment } from "@crm/types";

function printStep(step: Deployment["steps"][number]): void {
  const err = step.last_error ? ` — ${step.last_error}` : "";
  console.log(`  ${step.key.padEnd(16)} ${step.status}${err}`);
}

function printDeployment(d: Deployment): void {
  console.log(`${d.deployment_number}  ${d.name}`);
  console.log(`  domain:  ${d.domain}`);
  console.log(`  status:  ${d.status}`);
  console.log(`  steps:`);
  d.steps.forEach(printStep);
}

export async function statusCommand(id?: string, opts?: { q?: string }): Promise<void> {
  const session = requireSession();
  const config = loadConfig();
  const client = createCrmClient(config, session.access_token);

  if (id) {
    const deployment = await getDeployment(client, id);
    printDeployment(deployment);
    return;
  }

  const rows = await listDeployments(client, { q: opts?.q });
  if (rows.length === 0) {
    console.log("No deployments found.");
    return;
  }
  for (const d of rows) {
    console.log(
      `${d.deployment_number}  ${d.status.padEnd(12)} ${d.domain.padEnd(32)} ${d.name}  (${d._id})`,
    );
  }
}
