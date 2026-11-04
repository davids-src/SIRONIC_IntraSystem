import { requireSession, loadConfig } from "../auth/session.js";
import { createCrmClient } from "../api/http-client.js";
import { getEvents } from "../api/deployments.js";

export async function eventsCommand(id: string, opts: { limit?: number }): Promise<void> {
  const session = requireSession();
  const config = loadConfig();
  const client = createCrmClient(config, session.access_token);

  const { items } = await getEvents(client, id, undefined, opts.limit ?? 50);
  if (items.length === 0) {
    console.log("No events.");
    return;
  }
  // API returns newest-first; print oldest-first so it reads top-to-bottom like a log.
  for (const ev of [...items].reverse()) {
    const ts = new Date(ev.created_at).toISOString();
    const step = ev.step_key ? ` [${ev.step_key}]` : "";
    console.log(`${ts}  ${ev.kind}${step}  ${ev.message}`);
  }
}
