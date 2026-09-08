import { IntegrationError } from "@crm/integrations";
import { OrchestratorError } from "../errors";
import type {
  StepContext,
  StepHandler,
  StepPlan,
  StepResult,
  StepVerifyResult,
} from "../types";
import { getStep, npm } from "../util";

function domainNames(ctx: StepContext): string[] {
  return ctx.deployment.www_redirect
    ? [ctx.deployment.domain, `www.${ctx.deployment.domain}`]
    : [ctx.deployment.domain];
}

function certificateId(ctx: StepContext): number {
  const certStep = getStep(ctx.deployment, "ssl_certificate");
  if (!certStep.external_id) {
    throw new OrchestratorError(
      "CERT_NOT_READY",
      "Az SSL tanúsítvány lépés még nincs kész.",
    );
  }
  return Number(certStep.external_id);
}

export const proxyHostStep: StepHandler = {
  key: "proxy_host",
  dependsOn: ["ssl_certificate"],
  canSkip: true,

  async plan(ctx: StepContext): Promise<StepPlan> {
    const { forward_host, forward_port } = ctx.deployment.proxy;
    return {
      summary: `Proxy host létrehozása: ${domainNames(ctx).join(", ")} -> ${forward_host}:${forward_port}`,
      mutations: [
        { provider: "npm", action: "create_proxy_host", target: ctx.deployment.domain },
      ],
      warnings:
        forward_host && forward_port ? [] : ["Hiányzik a forward_host/forward_port."],
    };
  },

  async execute(ctx: StepContext): Promise<StepResult> {
    const { forward_host, forward_port, forward_scheme, websocket_support } =
      ctx.deployment.proxy;
    if (!forward_host || !forward_port) {
      throw new OrchestratorError(
        "PROXY_TARGET_MISSING",
        "Hiányzik a forward_host/forward_port.",
      );
    }
    const client = npm(ctx);
    const host = await client.createProxyHost({
      domainNames: domainNames(ctx),
      forwardScheme: forward_scheme,
      forwardHost: forward_host,
      forwardPort: forward_port,
      certificateId: certificateId(ctx),
      allowWebsocketUpgrade: websocket_support,
    });
    return {
      status: "done",
      external_id: String(host.id),
      message: "Proxy host létrehozva.",
      external_ids_patch: { npm_proxy_host_id: host.id },
    };
  },

  async adopt(ctx: StepContext, input): Promise<StepResult> {
    const client = npm(ctx);
    const host = await client.getProxyHost(Number(input.external_id));
    if (!host.domain_names.includes(ctx.deployment.domain)) {
      throw new OrchestratorError(
        "HOST_MISMATCH",
        "A proxy host nem tartalmazza a deployment domainjét.",
      );
    }
    return {
      status: "adopted",
      external_id: String(host.id),
      message: "Meglévő proxy host hozzárendelve.",
      external_ids_patch: { npm_proxy_host_id: host.id },
    };
  },

  async verify(ctx: StepContext): Promise<StepVerifyResult> {
    const step = getStep(ctx.deployment, "proxy_host");
    if (!step.external_id)
      return {
        ok: false,
        drift: ["missing_proxy_host_id"],
        message: "Nincs proxy host.",
      };
    try {
      const client = npm(ctx);
      const host = await client.getProxyHost(Number(step.external_id));
      const drift: string[] = [];
      if (host.forward_host !== ctx.deployment.proxy.forward_host)
        drift.push("proxy.forward_host_mismatch");
      if (host.forward_port !== ctx.deployment.proxy.forward_port)
        drift.push("proxy.forward_port_mismatch");
      return {
        ok: drift.length === 0,
        drift,
        message: drift.length === 0 ? "Rendben." : "Eltérés található.",
      };
    } catch (err) {
      if (err instanceof IntegrationError)
        return { ok: false, drift: ["npm_error"], message: err.safeMessage };
      throw err;
    }
  },
};
