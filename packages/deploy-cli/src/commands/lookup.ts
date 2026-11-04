import { requireSession, loadConfig } from "../auth/session.js";
import { createCrmClient } from "../api/http-client.js";
import { searchContacts } from "../api/contacts.js";
import { listStackTemplates } from "../api/stack-templates.js";
import { listDeploymentPackages } from "../api/deployment-packages.js";

/**
 * Read-only, JSON-out lookups — not meant for a human operator's eyes (the interactive
 * `deploy` wizard already does these searches inline). They exist so a scripted caller,
 * notably the `/deploy` skill, can resolve a contact/template/package_id to pass into
 * `deploy --file` without re-implementing any of the CRM API calls itself.
 */

export async function contactsLookupCommand(opts: { q?: string }): Promise<void> {
  const session = requireSession();
  const client = createCrmClient(loadConfig(), session.access_token);
  const contacts = await searchContacts(client, opts.q);
  console.log(
    JSON.stringify(
      contacts.map((c) => ({
        _id: c._id,
        contact_number: c.contact_number,
        name: c.name,
      })),
      null,
      2,
    ),
  );
}

export async function templatesLookupCommand(): Promise<void> {
  const session = requireSession();
  const client = createCrmClient(loadConfig(), session.access_token);
  const templates = await listStackTemplates(client);
  console.log(
    JSON.stringify(
      templates.map((t) => ({ _id: t._id, name: t.name, description: t.description })),
      null,
      2,
    ),
  );
}

export async function packagesLookupCommand(): Promise<void> {
  const session = requireSession();
  const client = createCrmClient(loadConfig(), session.access_token);
  const packages = await listDeploymentPackages(client);
  console.log(
    JSON.stringify(
      packages
        .filter((p) => p.is_active)
        .map((p) => ({
          _id: p._id,
          name: p.name,
          price_huf: p.price_huf,
          default_cycle: p.default_cycle,
        })),
      null,
      2,
    ),
  );
}
