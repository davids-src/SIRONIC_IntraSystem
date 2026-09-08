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

function intendedRecords(
  ctx: StepContext,
): Array<{ type: "A" | "CNAME"; name: string; content: string }> {
  const { domain, dns, www_redirect } = ctx.deployment;
  const target = dns.target ?? "";
  const records: Array<{ type: "A" | "CNAME"; name: string; content: string }> = [
    { type: dns.record_type, name: domain, content: target },
  ];
  if (www_redirect) {
    records.push({ type: "CNAME", name: `www.${domain}`, content: domain });
  }
  return records;
}

export const dnsRecordsStep: StepHandler = {
  key: "dns_records",
  dependsOn: ["ns_delegation"],
  canSkip: true,

  async plan(ctx: StepContext): Promise<StepPlan> {
    const records = intendedRecords(ctx);
    return {
      summary: `DNS rekordok létrehozása: ${records.map((r) => `${r.type} ${r.name} -> ${r.content}`).join(", ")}`,
      mutations: records.map((r) => ({
        provider: "cloudflare",
        action: "upsert_dns_record",
        target: r.name,
      })),
      warnings: ctx.deployment.dns.target ? [] : ["Nincs megadva DNS cél (dns.target)."],
    };
  },

  async execute(ctx: StepContext): Promise<StepResult> {
    if (!ctx.deployment.dns.target) {
      throw new OrchestratorError(
        "DNS_TARGET_MISSING",
        "Nincs megadva DNS cél (dns.target).",
      );
    }
    const cf = cloudflare(ctx);
    const zone = zoneId(ctx);
    const ids: string[] = [];
    for (const record of intendedRecords(ctx)) {
      const { id } = await cf.upsertDnsRecord(zone, {
        type: record.type,
        name: record.name,
        content: record.content,
        proxied: ctx.deployment.dns.proxied,
      });
      ids.push(id);
    }
    return {
      status: "done",
      external_id: ids[0] ?? null,
      message: "DNS rekordok létrehozva/frissítve.",
      external_ids_patch: { cloudflare_dns_record_ids: ids },
    };
  },

  async adopt(ctx: StepContext, input): Promise<StepResult> {
    const cf = cloudflare(ctx);
    const records = await cf.listDnsRecords(zoneId(ctx));
    const match = records.find((r) => r.id === input.external_id);
    if (!match) {
      throw new OrchestratorError(
        "RECORD_NOT_FOUND",
        "A megadott DNS rekord nem található a zónában.",
      );
    }
    return {
      status: "adopted",
      external_id: match.id,
      message: "Meglévő DNS rekord hozzárendelve.",
      external_ids_patch: { cloudflare_dns_record_ids: [match.id] },
    };
  },

  async verify(ctx: StepContext): Promise<StepVerifyResult> {
    const cf = cloudflare(ctx);
    const records = await cf.listDnsRecords(zoneId(ctx));
    const drift: string[] = [];
    for (const intended of intendedRecords(ctx)) {
      const live = records.find(
        (r) => r.name === intended.name && r.type === intended.type,
      );
      if (!live) {
        drift.push(`dns.missing:${intended.name}`);
      } else if (live.content !== intended.content) {
        drift.push(
          `dns.content_mismatch:${intended.name} expected ${intended.content} got ${live.content}`,
        );
      }
    }
    return {
      ok: drift.length === 0,
      drift,
      message: drift.length === 0 ? "Rendben." : "Eltérés a DNS rekordokban.",
    };
  },
};
