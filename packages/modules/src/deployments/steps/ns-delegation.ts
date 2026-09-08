import { OrchestratorError } from "../errors";
import type {
  StepContext,
  StepHandler,
  StepPlan,
  StepResult,
  StepVerifyResult,
} from "../types";
import { cloudflare, getStep } from "../util";

function zoneId(ctx: StepContext): string {
  const zoneStep = getStep(ctx.deployment, "cloudflare_zone");
  if (!zoneStep.external_id) {
    throw new OrchestratorError(
      "ZONE_NOT_READY",
      "A Cloudflare zóna lépés még nincs kész.",
    );
  }
  return zoneStep.external_id;
}

export const nsDelegationStep: StepHandler = {
  key: "ns_delegation",
  dependsOn: ["cloudflare_zone"],
  canSkip: true,

  async plan(ctx: StepContext): Promise<StepPlan> {
    const zoneStep = getStep(ctx.deployment, "cloudflare_zone");
    const nameServers = (zoneStep.meta?.name_servers as string[] | undefined) ?? [];
    return {
      summary:
        nameServers.length > 0
          ? `NS delegálás: állítsd be a következő nameservereket a regisztrátornál: ${nameServers.join(", ")}`
          : "NS delegálás: a nameserverek még nem ismertek (futtasd le előbb a cloudflare_zone lépést).",
      mutations: [],
      warnings: ["Ez a lépés manuális beavatkozást igényel a regisztrátornál."],
    };
  },

  async execute(ctx: StepContext): Promise<StepResult> {
    const zoneStep = getStep(ctx.deployment, "cloudflare_zone");
    const nameServers = (zoneStep.meta?.name_servers as string[] | undefined) ?? [];
    return {
      status: "manual_required",
      message:
        nameServers.length > 0
          ? `Állítsd be a következő nameservereket a regisztrátornál: ${nameServers.join(", ")}`
          : "Nincsenek elérhető nameserverek — előbb futtasd a cloudflare_zone lépést.",
      meta: { name_servers: nameServers },
    };
  },

  async adopt(ctx: StepContext): Promise<StepResult> {
    const cf = cloudflare(ctx);
    const zone = await cf.getZone(zoneId(ctx));
    if (zone.status !== "active") {
      throw new OrchestratorError(
        "ZONE_NOT_ACTIVE",
        `A zóna státusza "${zone.status}" — az NS delegálás adoptálásához aktív zóna szükséges.`,
      );
    }
    return { status: "done", message: "Zóna már aktív, NS delegálás kész." };
  },

  async verify(ctx: StepContext): Promise<StepVerifyResult> {
    const cf = cloudflare(ctx);
    const id = zoneId(ctx);
    await cf.triggerActivationCheck(id);
    const zone = await cf.getZone(id);
    const ok = zone.status === "active";
    return {
      ok,
      drift: ok ? [] : [`zone_status:${zone.status}`],
      message: ok
        ? "A zóna aktív."
        : `A zóna státusza még "${zone.status}" — várj a DNS propagációra.`,
    };
  },
};
