import { readFileSync } from "node:fs";
import { requireSession, loadConfig } from "../auth/session.js";
import { createCrmClient } from "../api/http-client.js";
import { searchContacts } from "../api/contacts.js";
import { listStackTemplates } from "../api/stack-templates.js";
import { listDeploymentPackages } from "../api/deployment-packages.js";
import {
  createDeployment,
  runNextSteps,
  type CreateDeploymentInput,
} from "../api/deployments.js";
import { askText, askConfirm, askNumber, askSelect, closePrompts } from "../prompts.js";
import { createDeploymentInputSchema } from "../schema.js";
import type { Contact, StackTemplate, DeploymentPackage, Deployment } from "@crm/types";

const MAX_RUN_ROUNDS = 10;

export interface DeployOptions {
  /** Path to a JSON file matching CreateDeploymentInput — skips the interactive wizard.
   * Meant for scripted callers (the /deploy skill) that already resolved every field
   * conversationally; a human operator should just run `deploy` with no flags. */
  file?: string;
  /** Skip both confirmation prompts (create, then run). */
  yes?: boolean;
  /** Default true; --no-run creates without starting the pipeline. */
  run?: boolean;
}

/**
 * Mirrors apps/crm/app/(crm)/deployments/new/page.tsx's "single" mode field-for-field —
 * same fields, same defaults, same "only send the sub-object if its anchor field is
 * filled" behavior — so a deployment created here looks exactly like one made through the
 * CRM wizard. Multi-host mode is not implemented here; each domain needs its own run.
 */
export async function deployCommand(opts: DeployOptions = {}): Promise<void> {
  const session = requireSession();
  const config = loadConfig();
  const client = createCrmClient(config, session.access_token);

  try {
    const input = opts.file
      ? readInputFromFile(opts.file)
      : await gatherInputInteractively(client, session.tenantId);

    console.log("\nÁttekintés:");
    console.log(JSON.stringify(input, null, 2));
    if (!opts.yes && !(await askConfirm("\nDeployment létrehozása?", true))) {
      console.log("Megszakítva.");
      return;
    }

    const deployment = await createDeployment(client, input);
    console.log(`\nLétrehozva: ${deployment.deployment_number} (${deployment._id})`);

    const shouldRun =
      opts.run === false
        ? false
        : opts.yes
          ? true
          : await askConfirm("Futtatás most (run)?", true);
    if (shouldRun) {
      await runUntilBlocked(client, deployment);
    } else {
      console.log(`Később: sironic-deploy status ${deployment._id}`);
    }
  } finally {
    closePrompts();
  }
}

function readInputFromFile(path: string): CreateDeploymentInput {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const parsed = createDeploymentInputSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      `Invalid --file payload:\n${JSON.stringify(parsed.error.flatten(), null, 2)}`,
    );
    process.exit(1);
  }
  return parsed.data;
}

async function gatherInputInteractively(
  client: ReturnType<typeof createCrmClient>,
  tenantId: string,
): Promise<CreateDeploymentInput> {
  console.log(`Új deployment — tenant ${tenantId}\n`);

  // ── Partner ──────────────────────────────────────────────────────────────
  const contactId = await pickContact(client);
  const name = await askText("Deployment neve", { required: true });
  const domain = await askText("Domain (pl. acme.hu)", { required: true });
  const wwwRedirect = await askConfirm("www. átirányítás", true);

  // ── DNS ──────────────────────────────────────────────────────────────────
  const dnsRecordType =
    (await askSelect("DNS rekord típus", [
      { label: "A (IPv4 cím)", value: "A" as const },
      { label: "CNAME (hostname alias)", value: "CNAME" as const },
    ])) ?? "A";
  const dnsName = await askText("DNS rekord neve", { default: "@" });
  const dnsTarget = await askText(dnsRecordType === "A" ? "Cél IP-cím" : "Cél hostname", {
    default: process.env.DEPLOYMENTS_PUBLIC_IP ?? "",
  });
  const dnsProxied = await askConfirm("Cloudflare proxy (narancs felhő)", false);

  // ── Stack & Image ──────────────────────────────────────────────────────
  const imageRepository = await askText("Image repository (opcionális)");
  const imageTag = imageRepository
    ? await askText("Image tag", { default: "latest" })
    : "";
  const workflowId = imageRepository ? await askText("GitHub workflow (opcionális)") : "";
  const stackName = await askText("Portainer stack neve (opcionális)");
  let templateId: string | null = null;
  let composeYaml = "";
  if (stackName) {
    const templates = await listStackTemplates(client);
    if (templates.length > 0) {
      templateId = await pickTemplate(templates);
      const picked = templates.find((t) => t._id === templateId);
      if (picked) composeYaml = picked.compose_yaml;
    }
    if (
      await askConfirm("docker-compose YAML módosítása/megadása kézzel?", !templateId)
    ) {
      console.log(
        "(egy sorban add meg; a sablon YAML-ja nem szerkeszthető itt interaktívan)",
      );
      composeYaml =
        (await askText("compose_yaml", { default: composeYaml })) || composeYaml;
    }
  }

  // ── Proxy ────────────────────────────────────────────────────────────────
  const forwardHost = await askText("Proxy forward host (opcionális)");
  const forwardPort = forwardHost
    ? await askNumber("Forward port", { default: 3000 })
    : 3000;
  const forwardScheme = forwardHost
    ? ((await askSelect("Forward séma", [
        { label: "http", value: "http" as const },
        { label: "https", value: "https" as const },
      ])) ?? "http")
    : "http";
  const websocketSupport = forwardHost
    ? await askConfirm("WebSocket támogatás", true)
    : true;

  // ── Billing ──────────────────────────────────────────────────────────────
  const packages = await listDeploymentPackages(client);
  const activePackages = packages.filter((p) => p.is_active);
  const packageId = activePackages.length > 0 ? await pickPackage(activePackages) : null;
  const billingCycle =
    packageId &&
    (await askSelect("Számlázási ciklus", [
      { label: "Havi", value: "monthly" as const },
      { label: "Negyedéves", value: "quarterly" as const },
      { label: "Éves", value: "yearly" as const },
    ]));
  const priceOverrideRaw = await askText("Ár felülírás HUF (opcionális)");
  const notes = await askText("Megjegyzések (opcionális)");

  return {
    contact_id: contactId,
    name,
    domain: domain.toLowerCase(),
    www_redirect: wwwRedirect,
    notes: notes || null,
    dns: dnsTarget
      ? {
          record_type: dnsRecordType,
          name: dnsName || "@",
          target: dnsTarget,
          proxied: dnsProxied,
        }
      : undefined,
    proxy: forwardHost
      ? {
          forward_host: forwardHost,
          forward_port: forwardPort,
          forward_scheme: forwardScheme,
          websocket_support: websocketSupport,
        }
      : undefined,
    image: imageRepository
      ? {
          repository: imageRepository,
          tag: imageTag || "latest",
          workflow_id: workflowId || null,
        }
      : undefined,
    stack: stackName
      ? {
          stack_name: stackName,
          template_id: templateId,
          compose_yaml: composeYaml || null,
          env: [],
        }
      : undefined,
    package_id: packageId,
    billing_cycle: billingCycle || null,
    price_override_huf: priceOverrideRaw ? Number(priceOverrideRaw) : null,
  };
}

async function pickContact(
  client: ReturnType<typeof createCrmClient>,
): Promise<string | null> {
  const q = await askText("Partner keresése (üres = összes, Enter = kihagyás)");
  const contacts = await searchContacts(client, q || undefined);
  if (contacts.length === 0) {
    console.log("Nincs találat — partner nélkül folytatjuk.");
    return null;
  }
  return askSelect(
    "Partner",
    contacts.map((c: Contact) => ({
      label: `${c.contact_number} — ${c.name}`,
      value: c._id,
    })),
    { allowSkip: "Nincs partner (kihagyás)" },
  );
}

function pickTemplate(templates: StackTemplate[]): Promise<string | null> {
  return askSelect(
    "Stack sablon",
    templates.map((t) => ({ label: t.name, value: t._id })),
    { allowSkip: "Nincs sablon (inline YAML)" },
  );
}

function pickPackage(packages: DeploymentPackage[]): Promise<string | null> {
  return askSelect(
    "Csomag",
    packages.map((p) => ({ label: `${p.name} (${p.price_huf} HUF)`, value: p._id })),
    { allowSkip: "Nincs csomag" },
  );
}

export async function runUntilBlocked(
  client: ReturnType<typeof createCrmClient>,
  initial: Deployment,
): Promise<void> {
  let deployment = initial;
  for (let round = 0; round < MAX_RUN_ROUNDS; round++) {
    const result = await runNextSteps(client, deployment._id, 8);
    deployment = result.deployment;
    if (result.ran.length > 0) {
      console.log(`Futtatva: ${result.ran.join(", ")}`);
    }
    for (const b of result.blocked) {
      console.log(`Blokkolva — ${b.key}: ${b.reason}`);
    }
    const manualStep = deployment.steps.find((s) => s.status === "manual_required");
    if (manualStep) {
      console.log(
        `\nManuális lépés szükséges — ${manualStep.key}: ${manualStep.message ?? ""}`,
      );
      console.log(`Az elvégzés után: sironic-deploy status ${deployment._id}`);
      return;
    }
    if (result.ran.length === 0) {
      if (result.blocked.length === 0) {
        console.log(`\nKész. Státusz: ${deployment.status}`);
      } else {
        console.log(`\nMegállt. Státusz: ${deployment.status}`);
      }
      return;
    }
  }
  console.log(
    `\nElérte a ${MAX_RUN_ROUNDS} kört — ellenőrizd: sironic-deploy status ${deployment._id}`,
  );
}
