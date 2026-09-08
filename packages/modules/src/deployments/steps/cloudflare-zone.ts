import { IntegrationError } from "@crm/integrations";
import { OrchestratorError } from "../errors";
import type {
  StepContext,
  StepHandler,
  StepPlan,
  StepResult,
  StepVerifyResult,
} from "../types";
import { cloudflare, getStep } from "../util";

export const cloudflareZoneStep: StepHandler = {
  key: "cloudflare_zone",
  dependsOn: [],
  canSkip: true,

  async plan(ctx: StepContext): Promise<StepPlan> {
    const cf = cloudflare(ctx);
    const existing = await cf.listZones({ name: ctx.deployment.domain });
    if (existing.length > 0) {
      return {
        summary: `Cloudflare zóna már létezik "${ctx.deployment.domain}" névvel — Adopt javasolt.`,
        mutations: [],
        warnings: ["A zóna már létezik ezen a fiókon."],
      };
    }
    return {
      summary: `Cloudflare zóna létrehozása: ${ctx.deployment.domain}`,
      mutations: [
        { provider: "cloudflare", action: "create_zone", target: ctx.deployment.domain },
      ],
      warnings: [],
    };
  },

  async execute(ctx: StepContext): Promise<StepResult> {
    const cf = cloudflare(ctx);
    const zone = await cf.createZone(ctx.deployment.domain);
    return {
      status: "done",
      external_id: zone.id,
      message: "Zone létrehozva.",
      meta: { name_servers: zone.nameServers, cf_status: zone.status },
      external_ids_patch: { cloudflare_zone_id: zone.id },
    };
  },

  async adopt(ctx: StepContext, input): Promise<StepResult> {
    const cf = cloudflare(ctx);
    const zone = await cf.getZone(input.external_id);
    if (zone.name !== ctx.deployment.domain) {
      throw new OrchestratorError(
        "DOMAIN_MISMATCH",
        `A zóna ("${zone.name}") nem egyezik a deployment domainjével ("${ctx.deployment.domain}").`,
      );
    }
    return {
      status: "adopted",
      external_id: zone.id,
      message: "Meglévő Cloudflare zóna hozzárendelve.",
      meta: { name_servers: zone.name_servers, cf_status: zone.status },
      external_ids_patch: { cloudflare_zone_id: zone.id },
    };
  },

  async verify(ctx: StepContext): Promise<StepVerifyResult> {
    const step = getStep(ctx.deployment, "cloudflare_zone");
    if (!step.external_id) {
      return {
        ok: false,
        drift: ["missing_zone_id"],
        message: "Nincs hozzárendelt zóna.",
      };
    }
    const cf = cloudflare(ctx);
    try {
      const zone = await cf.getZone(step.external_id);
      const drift: string[] = [];
      if (zone.name !== ctx.deployment.domain) drift.push("zone.name_mismatch");
      return {
        ok: drift.length === 0,
        drift,
        message: drift.length === 0 ? "Rendben." : "Eltérés található.",
      };
    } catch (err) {
      if (err instanceof IntegrationError) {
        return { ok: false, drift: ["zone_not_found"], message: err.safeMessage };
      }
      throw err;
    }
  },
};
