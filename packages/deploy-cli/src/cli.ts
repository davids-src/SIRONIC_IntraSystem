#!/usr/bin/env node
import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { logoutCommand } from "./commands/logout.js";
import { whoamiCommand } from "./commands/whoami.js";
import { deployCommand, type DeployOptions } from "./commands/deploy.js";
import { redeployCommand } from "./commands/redeploy.js";
import { statusCommand } from "./commands/status.js";
import { eventsCommand } from "./commands/events.js";
import {
  contactsLookupCommand,
  templatesLookupCommand,
  packagesLookupCommand,
} from "./commands/lookup.js";
import { CliHttpError } from "./http-error.js";

const program = new Command();
program
  .name("sironic-deploy")
  .description("Partner site deployment CLI for Sironic infra");

function run(fn: () => Promise<void> | void) {
  return async () => {
    try {
      await fn();
    } catch (e) {
      if (e instanceof CliHttpError) {
        console.error(`Error (${e.status}): ${e.message}`);
      } else if (e instanceof Error) {
        console.error(`Error: ${e.message}`);
      } else {
        console.error(e);
      }
      process.exit(1);
    }
  };
}

program
  .command("login")
  .description("Log in via Sironic SSO (apps/auth)")
  .action(run(loginCommand));

program
  .command("logout")
  .description("Clear the stored local session")
  .action(run(logoutCommand));

program
  .command("whoami")
  .description("Show the currently logged-in operator")
  .action(run(whoamiCommand));

program
  .command("deploy")
  .description("Create a deployment (interactively, or from --file) and run it")
  .option("--file <path>", "JSON file matching CreateDeploymentInput — skips the wizard")
  .option("-y, --yes", "Skip confirmation prompts (implied flow for --file callers)")
  .option("--no-run", "Create without starting the pipeline")
  .action((opts: DeployOptions) => run(() => deployCommand(opts))());

program
  .command("contacts")
  .description("Look up partners (JSON out) — for resolving contact_id")
  .option("-q, --q <query>", "Search by name or contact_number")
  .action((opts: { q?: string }) => run(() => contactsLookupCommand(opts))());

program
  .command("templates")
  .description("List stack templates (JSON out) — for resolving stack.template_id")
  .action(run(templatesLookupCommand));

program
  .command("packages")
  .description("List active billing packages (JSON out) — for resolving package_id")
  .action(run(packagesLookupCommand));

program
  .command("redeploy")
  .description("Trigger stack_deploy for an existing deployment")
  .argument("<id>", "Deployment _id")
  .option("--tag <tag>", "New image tag to deploy")
  .action((id: string, opts: { tag?: string }) => run(() => redeployCommand(id, opts))());

program
  .command("status")
  .description("Show a deployment's step status, or list deployments")
  .argument("[id]", "Deployment _id (omit to list)")
  .option("-q, --q <query>", "Filter list by name/domain/number")
  .action((id: string | undefined, opts: { q?: string }) =>
    run(() => statusCommand(id, opts))(),
  );

program
  .command("events")
  .description("Show recent events for a deployment")
  .argument("<id>", "Deployment _id")
  .option("--limit <n>", "Max events (default 50)", (v) => Number(v))
  .action((id: string, opts: { limit?: number }) => run(() => eventsCommand(id, opts))());

program.parseAsync(process.argv);
