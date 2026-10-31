import { NextResponse } from "next/server";
import { DeploymentModel } from "@crm/db";
import { guard, handleApiError, requireCrmAuth, withDb } from "@/lib/api-helpers";
import { buildStepClientsForTenant } from "@/lib/deployments/clients";

type ImportCandidate = {
  domain: string;
  cloudflare_zone_id?: string;
  npm_proxy_host_id?: number;
  npm_certificate_id?: number;
  portainer_stack_id?: number;
  suggested_stack_name?: string;
  already_imported_deployment_id?: string;
  confidence: "high" | "medium" | "low";
};

function normalizeDomain(raw: string): string {
  let d = raw.trim().toLowerCase().replace(/\.$/, "");
  if (d.startsWith("www.")) d = d.slice(4);
  return d;
}

type CandidateBuilder = {
  domain: string;
  cloudflare_zone_id?: string;
  npm_proxy_host_id?: number;
  npm_certificate_id?: number;
  portainer_stack_id?: number;
  suggested_stack_name?: string;
  signals: Set<"cloudflare" | "npm" | "portainer">;
};

export async function POST() {
  try {
    const { actor } = await requireCrmAuth();
    guard(actor, { module: "deployment", action: "provision", scope: "global" });

    return await withDb(async () => {
      const { clients } = await buildStepClientsForTenant(actor.tenantId);
      const warnings: string[] = [];

      const [zones, proxyHosts, certificates, stacks] = await Promise.all([
        clients.cloudflare?.listZones().catch(() => []) ?? Promise.resolve([]),
        clients.npm?.listProxyHosts().catch(() => []) ?? Promise.resolve([]),
        clients.npm?.listCertificates().catch(() => []) ?? Promise.resolve([]),
        clients.portainer?.listStacks().catch(() => []) ?? Promise.resolve([]),
      ]);

      if (zones.length === 50) warnings.push("cloudflare_zones_truncated_at_50");

      const byDomain = new Map<string, CandidateBuilder>();
      const getOrCreate = (domain: string): CandidateBuilder => {
        let c = byDomain.get(domain);
        if (!c) {
          c = { domain, signals: new Set() };
          byDomain.set(domain, c);
        }
        return c;
      };

      for (const zone of zones) {
        const c = getOrCreate(normalizeDomain(zone.name));
        c.cloudflare_zone_id = zone.id;
        c.signals.add("cloudflare");
      }

      for (const host of proxyHosts) {
        const primary = host.domain_names[0];
        if (!primary) continue;
        const c = getOrCreate(normalizeDomain(primary));
        c.npm_proxy_host_id = host.id;
        if (typeof host.certificate_id === "number")
          c.npm_certificate_id = host.certificate_id;
        c.signals.add("npm");
      }

      for (const cert of certificates) {
        const primary = cert.domain_names[0];
        if (!primary) continue;
        const existing = byDomain.get(normalizeDomain(primary));
        if (existing && existing.npm_certificate_id == null) {
          existing.npm_certificate_id = cert.id;
        }
      }

      const unmatchedStacks: string[] = [];
      for (const stack of stacks) {
        const normalizedStack = stack.Name.toLowerCase().replace(/[^a-z0-9]/g, "");
        let matched = false;
        for (const c of byDomain.values()) {
          const label = (c.domain.split(".")[0] ?? "").replace(/[^a-z0-9]/g, "");
          if (label.length >= 3 && normalizedStack.includes(label)) {
            c.portainer_stack_id = stack.Id;
            c.suggested_stack_name = stack.Name;
            c.signals.add("portainer");
            matched = true;
            break;
          }
        }
        if (!matched) unmatchedStacks.push(stack.Name);
      }
      if (unmatchedStacks.length > 0) {
        warnings.push(`unmatched_stacks:${unmatchedStacks.join(",")}`);
      }

      const existingDeployments = await DeploymentModel.find(
        { tenantId: actor.tenantId },
        { domain: 1 },
      ).lean();
      const existingByDomain = new Map(
        existingDeployments.map((d) => [normalizeDomain(d.domain), String(d._id)]),
      );

      const candidates: ImportCandidate[] = [...byDomain.values()].map((c) => {
        const confidence: ImportCandidate["confidence"] =
          c.signals.size >= 3 ? "high" : c.signals.size === 2 ? "medium" : "low";
        const alreadyImported = existingByDomain.get(c.domain);
        return {
          domain: c.domain,
          cloudflare_zone_id: c.cloudflare_zone_id,
          npm_proxy_host_id: c.npm_proxy_host_id,
          npm_certificate_id: c.npm_certificate_id,
          portainer_stack_id: c.portainer_stack_id,
          suggested_stack_name: c.suggested_stack_name,
          already_imported_deployment_id: alreadyImported,
          confidence,
        };
      });

      return NextResponse.json({ candidates, warnings });
    });
  } catch (e) {
    return handleApiError(e);
  }
}
