import { DeploymentModel, formatNumber, nextCounterValue } from "@crm/db";
import { DEPLOYMENT_STEP_ORDER } from "@crm/modules";
import { normalizeDomain, type ImportCandidate } from "./import-scan";

export type BulkImportResult = {
  created: Array<{ domain: string; deployment_id: string }>;
  skipped: Array<{ domain: string; reason: string }>;
};

/**
 * Creates one "imported"/"live" Deployment per candidate, same shape as the single-domain
 * import wizard (POST /api/deployments with source:"imported") — steps that already have a
 * matching external id come in "adopted" so the orchestrator never re-runs them against
 * infra that's already there. No partner is assigned; contact_id stays null.
 */
export async function bulkImportCandidates(
  tenantId: string,
  actorId: string,
  candidates: ImportCandidate[],
): Promise<BulkImportResult> {
  const created: BulkImportResult["created"] = [];
  const skipped: BulkImportResult["skipped"] = [];

  for (const c of candidates) {
    if (c.already_imported_deployment_id) {
      skipped.push({ domain: c.domain, reason: "already_imported" });
      continue;
    }

    try {
      const n = await nextCounterValue(tenantId, "deployment");
      const deployment_number = formatNumber("DEP", n);
      // Compare normalized, not raw — c.domain already had "www."/trailing-dot stripped,
      // so a candidate whose only record is literally named "www.<domain>" still counts
      // as its apex record instead of falling through to an arbitrary dns_records[0].
      const apexRecord =
        c.dns_records?.find((r) => normalizeDomain(r.name) === c.domain) ??
        c.dns_records?.[0] ??
        null;
      // The single-create route enforces stack_name against /^[a-z0-9-]+$/ (it names real
      // Portainer resources on later steps) — a real compose project name can contain
      // characters that regex rejects, so sanitize instead of persisting it verbatim.
      const stackName = c.suggested_stack_name
        ?.toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/^-+|-+$/g, "");

      const buildStepStatus = (key: string): "pending" | "adopted" => {
        switch (key) {
          case "cloudflare_zone":
            return c.cloudflare_zone_id ? "adopted" : "pending";
          case "dns_records":
            return apexRecord ? "adopted" : "pending";
          case "ssl_certificate":
            return c.npm_certificate_id != null ? "adopted" : "pending";
          case "proxy_host":
            return c.npm_proxy_host_id != null ? "adopted" : "pending";
          case "stack_create":
          case "stack_deploy":
            return c.portainer_stack_id != null ? "adopted" : "pending";
          default:
            return "pending";
        }
      };

      const doc = await DeploymentModel.create({
        tenantId,
        contact_id: null,
        deployment_number,
        name: c.domain,
        domain: c.domain,
        www_redirect: true,
        status: "live",
        notes: "Automatikus bulk importálás (Domainek nézet).",
        dns: apexRecord
          ? {
              record_type: apexRecord.type === "CNAME" ? "CNAME" : "A",
              name: "@",
              target: apexRecord.content,
              proxied: apexRecord.proxied ?? false,
            }
          : undefined,
        proxy: c.npm_forward_host
          ? {
              forward_host: c.npm_forward_host,
              forward_port: c.npm_forward_port ?? 3000,
              forward_scheme: "http",
              websocket_support: true,
            }
          : undefined,
        stack: stackName
          ? {
              stack_name: stackName,
              template_id: null,
              compose_yaml: null,
              env: [],
            }
          : undefined,
        steps: DEPLOYMENT_STEP_ORDER.map((key) => ({
          key,
          status: buildStepStatus(key),
          external_id: (() => {
            switch (key) {
              case "cloudflare_zone":
                return c.cloudflare_zone_id ?? null;
              case "ssl_certificate":
                return c.npm_certificate_id != null ? String(c.npm_certificate_id) : null;
              case "proxy_host":
                return c.npm_proxy_host_id != null ? String(c.npm_proxy_host_id) : null;
              case "stack_create":
              case "stack_deploy":
                return c.portainer_stack_id != null ? String(c.portainer_stack_id) : null;
              default:
                return null;
            }
          })(),
        })),
        external_ids: {
          cloudflare_zone_id: c.cloudflare_zone_id ?? null,
          cloudflare_dns_record_ids: apexRecord ? [apexRecord.id] : [],
          npm_certificate_id: c.npm_certificate_id ?? null,
          npm_proxy_host_id: c.npm_proxy_host_id ?? null,
          portainer_stack_id: c.portainer_stack_id ?? null,
        },
        source: "imported",
        created_by: actorId,
      });
      created.push({ domain: c.domain, deployment_id: String(doc._id) });
    } catch (e) {
      skipped.push({
        domain: c.domain,
        reason: e instanceof Error ? e.message : "unknown_error",
      });
    }
  }

  return { created, skipped };
}
