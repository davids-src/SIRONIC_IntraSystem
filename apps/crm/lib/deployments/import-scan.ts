import { DeploymentModel } from "@crm/db";
import { buildStepClientsForTenant } from "@/lib/deployments/clients";

export type DnsRecordInfo = {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
};

export type ImportCandidate = {
  domain: string;
  cloudflare_zone_id?: string;
  cloudflare_zone_status?: string;
  /** DNS records whose own name matches *this* hostname — not the whole zone's record list. */
  dns_records?: DnsRecordInfo[];
  npm_proxy_host_id?: number;
  npm_certificate_id?: number;
  npm_forward_host?: string;
  npm_forward_port?: number;
  portainer_stack_id?: number;
  suggested_stack_name?: string;
  /** "container": resolved via the NPM forward_host -> running container -> compose project label (reliable). "fuzzy_name": guessed from the domain string (fallback). */
  stack_match_method?: "container" | "fuzzy_name";
  already_imported_deployment_id?: string;
  confidence: "high" | "medium" | "low";
};

export function normalizeDomain(raw: string): string {
  let d = raw.trim().toLowerCase().replace(/\.$/, "");
  if (d.startsWith("www.")) d = d.slice(4);
  return d;
}

function stripContainerName(name: string): string {
  return name.replace(/^\//, "").toLowerCase();
}

type CandidateBuilder = {
  domain: string;
  cloudflare_zone_id?: string;
  cloudflare_zone_status?: string;
  dns_records?: DnsRecordInfo[];
  npm_proxy_host_id?: number;
  npm_certificate_id?: number;
  npm_forward_host?: string;
  npm_forward_port?: number;
  portainer_stack_id?: number;
  suggested_stack_name?: string;
  stack_match_method?: "container" | "fuzzy_name";
  signals: Set<"cloudflare" | "npm" | "portainer">;
};

export async function runImportScan(
  tenantId: string,
): Promise<{ candidates: ImportCandidate[]; warnings: string[] }> {
  const { clients } = await buildStepClientsForTenant(tenantId);
  const warnings: string[] = [];

  const [zones, proxyHosts, certificates, stacks, containers] = await Promise.all([
    clients.cloudflare?.listZones().catch(() => []) ?? Promise.resolve([]),
    clients.npm?.listProxyHosts().catch(() => []) ?? Promise.resolve([]),
    clients.npm?.listCertificates().catch(() => []) ?? Promise.resolve([]),
    clients.portainer?.listStacks().catch(() => []) ?? Promise.resolve([]),
    clients.portainer?.listContainers().catch(() => []) ?? Promise.resolve([]),
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
    c.cloudflare_zone_status = zone.status;
    c.signals.add("cloudflare");
  }

  // NPM proxy hosts next (before DNS) so every reverse-proxied hostname already has a
  // candidate by the time DNS records get distributed below.
  for (const host of proxyHosts) {
    const primary = host.domain_names[0];
    if (!primary) continue;
    const c = getOrCreate(normalizeDomain(primary));
    c.npm_proxy_host_id = host.id;
    c.npm_forward_host = host.forward_host;
    c.npm_forward_port = host.forward_port;
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

  // Pull every DNS record per zone and file each one under *its own* hostname (not the
  // zone apex) — a zone's record set covers every subdomain, so e.g. admin.example.com's
  // own record used to get silently dumped onto example.com's candidate instead, making it
  // look like admin.example.com had no DNS at all.
  //
  // Deliberately a *lookup*, not a get-or-create: Cloudflare zones are full of records that
  // aren't websites at all (ACME challenge CNAMEs, autodiscover/mail/DMARC entries, etc.).
  // Only attach a record to a candidate that already exists — the zone apex itself, or a
  // hostname an NPM proxy host actually serves — instead of minting a brand-new "domain"
  // (and therefore a bulk-importable deployment candidate) out of pure DNS plumbing.
  if (clients.cloudflare) {
    const dnsResults = await Promise.all(
      zones.map((zone) => clients.cloudflare!.listDnsRecords(zone.id).catch(() => null)),
    );
    zones.forEach((zone, i) => {
      const records = dnsResults[i];
      if (!records) {
        warnings.push(`dns_records_fetch_failed:${zone.name}`);
        return;
      }
      for (const r of records) {
        if (r.type !== "A" && r.type !== "CNAME") continue;
        const c = byDomain.get(normalizeDomain(r.name));
        if (!c) continue;
        const info: DnsRecordInfo = {
          id: r.id,
          type: r.type,
          name: r.name,
          content: r.content,
          proxied: r.proxied,
        };
        c.dns_records = [...(c.dns_records ?? []), info];
        c.signals.add("cloudflare");
      }
    });
  }

  // Reliable correlation: NPM's "forward_host" for a proxy host is almost always the
  // actual compose service/container name it points at. Resolve that to a running
  // container, read its compose project label, and match that straight to a Portainer
  // stack — this nails down the real backend instead of guessing from the domain text.
  const containerByName = new Map<string, (typeof containers)[number]>();
  for (const container of containers) {
    for (const name of container.Names) {
      containerByName.set(stripContainerName(name), container);
    }
  }
  const stackByName = new Map(stacks.map((s) => [s.Name.toLowerCase(), s]));

  for (const c of byDomain.values()) {
    if (!c.npm_forward_host) continue;
    const container = containerByName.get(c.npm_forward_host.toLowerCase());
    const project =
      container?.Labels?.["com.docker.compose.project"] ??
      container?.Labels?.["com.docker.stack.namespace"];
    if (!project) continue;
    const stack = stackByName.get(project.toLowerCase());
    if (stack) {
      c.portainer_stack_id = stack.Id;
      c.suggested_stack_name = stack.Name;
      c.stack_match_method = "container";
      c.signals.add("portainer");
    }
  }

  // Fallback for whatever didn't resolve via a live container (e.g. the container is
  // stopped right now): fuzzy match the stack name against the domain label.
  const unmatchedStacks: string[] = [];
  for (const stack of stacks) {
    const alreadyMatched = [...byDomain.values()].some(
      (c) => c.portainer_stack_id === stack.Id,
    );
    if (alreadyMatched) continue;
    const normalizedStack = stack.Name.toLowerCase().replace(/[^a-z0-9]/g, "");
    let matched = false;
    for (const c of byDomain.values()) {
      if (c.portainer_stack_id) continue;
      const label = (c.domain.split(".")[0] ?? "").replace(/[^a-z0-9]/g, "");
      if (label.length >= 3 && normalizedStack.includes(label)) {
        c.portainer_stack_id = stack.Id;
        c.suggested_stack_name = stack.Name;
        c.stack_match_method = "fuzzy_name";
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
    { tenantId },
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
      cloudflare_zone_status: c.cloudflare_zone_status,
      dns_records: c.dns_records,
      npm_proxy_host_id: c.npm_proxy_host_id,
      npm_certificate_id: c.npm_certificate_id,
      npm_forward_host: c.npm_forward_host,
      npm_forward_port: c.npm_forward_port,
      portainer_stack_id: c.portainer_stack_id,
      suggested_stack_name: c.suggested_stack_name,
      stack_match_method: c.stack_match_method,
      already_imported_deployment_id: alreadyImported,
      confidence,
    };
  });

  return { candidates, warnings };
}
