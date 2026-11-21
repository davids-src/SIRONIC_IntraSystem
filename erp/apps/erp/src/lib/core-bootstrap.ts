import { jelzesApi } from "@erp/jelzes";
import { seedEngineMailTemplates } from "@erp/admin";

const SYNCED = Symbol.for("erp.coreBootstrapped");

/** Wires cross-module domain-event listeners once per process (see docs/ARCHITECTURE.md §1). */
export function ensureCoreBootstrapped(): void {
  const g = globalThis as typeof globalThis & { [SYNCED]?: boolean };
  if (g[SYNCED]) return;
  // Domain modules: register their `onDomainEvent` listeners here.
  g[SYNCED] = true;
  // Task events no longer become Jelzések — drop the ones stored before the change.
  void jelzesApi
    .feladatJelzesekTorlese()
    .catch((e) => console.error("Feladat-jelzések törlése", e));
  // New baseline mail templates (e.g. the #71 notification e-mails) reach existing installs too;
  // only missing keys are created — admin edits are never overwritten.
  void seedEngineMailTemplates().catch((e) =>
    console.error("E-mail sablonok pótlása", e),
  );
}
