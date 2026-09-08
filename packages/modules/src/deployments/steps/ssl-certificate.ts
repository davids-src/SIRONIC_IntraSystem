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

const MIN_NPM_VERSION = "2.11.3";

function domainNames(ctx: StepContext): string[] {
  return ctx.deployment.www_redirect
    ? [ctx.deployment.domain, `www.${ctx.deployment.domain}`]
    : [ctx.deployment.domain];
}

export const sslCertificateStep: StepHandler = {
  key: "ssl_certificate",
  dependsOn: ["dns_records"],
  canSkip: true,

  async plan(ctx: StepContext): Promise<StepPlan> {
    return {
      summary: `Let's Encrypt tanúsítvány igénylése (DNS-01, Cloudflare): ${domainNames(ctx).join(", ")}`,
      mutations: [
        { provider: "npm", action: "create_certificate", target: ctx.deployment.domain },
      ],
      warnings: ["Az NPM verziójának legalább 2.11.3-nak kell lennie (CVE-2024-39935)."],
    };
  },

  async execute(ctx: StepContext, input): Promise<StepResult> {
    const client = npm(ctx);
    await client.assertMinVersion(MIN_NPM_VERSION);
    const dnsProviderCredentials = input?.dns_provider_credentials;
    if (
      typeof dnsProviderCredentials !== "string" ||
      dnsProviderCredentials.length === 0
    ) {
      throw new OrchestratorError(
        "DNS_TOKEN_MISSING",
        "Hiányzik az NPM DNS-01 Cloudflare token (dns_provider_credentials).",
      );
    }
    const cert = await client.createCertificate({
      domainNames: domainNames(ctx),
      dnsProviderCredentials,
      letsencryptEmail:
        (input?.letsencrypt_email as string | undefined) ?? "ops@sironic.eu",
    });
    return {
      status: "done",
      external_id: String(cert.id),
      message: "SSL tanúsítvány létrehozva.",
      external_ids_patch: { npm_certificate_id: cert.id },
    };
  },

  async adopt(ctx: StepContext, input): Promise<StepResult> {
    const client = npm(ctx);
    const certs = await client.listCertificates();
    const id = Number(input.external_id);
    const match = certs.find((c) => c.id === id);
    if (!match || !match.domain_names.includes(ctx.deployment.domain)) {
      throw new OrchestratorError(
        "CERT_MISMATCH",
        "A megadott tanúsítvány nem tartalmazza a deployment domainjét.",
      );
    }
    return {
      status: "adopted",
      external_id: String(match.id),
      message: "Meglévő tanúsítvány hozzárendelve.",
      external_ids_patch: { npm_certificate_id: match.id },
    };
  },

  async verify(ctx: StepContext): Promise<StepVerifyResult> {
    const step = getStep(ctx.deployment, "ssl_certificate");
    if (!step.external_id) {
      return {
        ok: false,
        drift: ["missing_certificate_id"],
        message: "Nincs hozzárendelt tanúsítvány.",
      };
    }
    try {
      const client = npm(ctx);
      const certs = await client.listCertificates();
      const match = certs.find((c) => c.id === Number(step.external_id));
      if (!match)
        return {
          ok: false,
          drift: ["certificate_not_found"],
          message: "A tanúsítvány nem található.",
        };
      const ok = match.domain_names.includes(ctx.deployment.domain);
      return {
        ok,
        drift: ok ? [] : ["certificate.domain_mismatch"],
        message: ok ? "Rendben." : "Domain eltérés.",
      };
    } catch (err) {
      if (err instanceof IntegrationError)
        return { ok: false, drift: ["npm_error"], message: err.safeMessage };
      throw err;
    }
  },
};
