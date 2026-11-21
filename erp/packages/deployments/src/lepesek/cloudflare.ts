import { IntegrationError } from "@erp/integrations";
import {
  kliens,
  lepesAdat,
  OrchestratorHiba,
  type LepesKezelo,
  type LepesKontextus,
} from "./tipusok";

const cf = (ctx: LepesKontextus) => kliens(ctx.kliensek, "cloudflare");

function zonaId(ctx: LepesKontextus): string {
  const id = lepesAdat(ctx.telepites, "cloudflare_zona").kulsoId;
  if (!id) {
    throw new OrchestratorHiba("ZONA_NEM_KESZ", "A Cloudflare zóna lépés még nincs kész.");
  }
  return id;
}

const nameServers = (ctx: LepesKontextus): string[] =>
  (lepesAdat(ctx.telepites, "cloudflare_zona").meta?.name_servers as string[] | undefined) ??
  [];

export const cloudflareZonaLepes: LepesKezelo = {
  kulcs: "cloudflare_zona",

  async terv(ctx) {
    const domain = ctx.telepites.domain;
    const letezo = await cf(ctx).listZones({ name: domain });
    if (letezo.length > 0) {
      return {
        osszegzes: `Cloudflare zóna már létezik "${domain}" névvel — adoptálás javasolt.`,
        valtoztatasok: [],
        figyelmeztetesek: ["A zóna már létezik ezen a fiókon."],
      };
    }
    return {
      osszegzes: `Cloudflare zóna létrehozása: ${domain}`,
      valtoztatasok: [{ szolgaltato: "cloudflare", muvelet: "zona_letrehozas", cel: domain }],
      figyelmeztetesek: [],
    };
  },

  async vegrehajt(ctx) {
    const zona = await cf(ctx).createZone(ctx.telepites.domain);
    return {
      allapot: "kesz",
      kulsoId: zona.id,
      uzenet: "Zóna létrehozva.",
      meta: { name_servers: zona.nameServers, cf_status: zona.status },
      kulsoIdkPatch: { cloudflareZonaId: zona.id },
    };
  },

  async adoptal(ctx, input) {
    const zona = await cf(ctx).getZone(input.kulsoId);
    const domain = ctx.telepites.domain;
    if (!(domain === zona.name || domain.endsWith(`.${zona.name}`))) {
      throw new OrchestratorHiba(
        "DOMAIN_ELTERES",
        `A zóna ("${zona.name}") nem fedi le a telepítés domainjét ("${domain}").`,
      );
    }
    return {
      allapot: "adoptalva",
      kulsoId: zona.id,
      uzenet: "Meglévő Cloudflare zóna hozzárendelve.",
      meta: { name_servers: zona.name_servers, cf_status: zona.status },
      kulsoIdkPatch: { cloudflareZonaId: zona.id },
    };
  },

  async ellenoriz(ctx) {
    const l = lepesAdat(ctx.telepites, "cloudflare_zona");
    if (!l.kulsoId) {
      return { ok: false, elteresek: ["missing_zone_id"], uzenet: "Nincs hozzárendelt zóna." };
    }
    try {
      const zona = await cf(ctx).getZone(l.kulsoId);
      const domain = ctx.telepites.domain;
      const elteresek =
        domain === zona.name || domain.endsWith(`.${zona.name}`)
          ? []
          : ["zone.name_mismatch"];
      return {
        ok: elteresek.length === 0,
        elteresek,
        uzenet: elteresek.length === 0 ? "Rendben." : "Eltérés található.",
      };
    } catch (err) {
      if (err instanceof IntegrationError) {
        return { ok: false, elteresek: ["zone_not_found"], uzenet: err.safeMessage };
      }
      throw err;
    }
  },
};

export const nsDelegalasLepes: LepesKezelo = {
  kulcs: "ns_delegalas",

  async terv(ctx) {
    const ns = nameServers(ctx);
    return {
      osszegzes:
        ns.length > 0
          ? `NS delegálás: állítsd be a következő nameservereket a regisztrátornál: ${ns.join(", ")}`
          : "NS delegálás: a nameserverek még nem ismertek (futtasd le előbb a Cloudflare zóna lépést).",
      valtoztatasok: [],
      figyelmeztetesek: ["Ez a lépés manuális beavatkozást igényel a regisztrátornál."],
    };
  },

  async vegrehajt(ctx) {
    const ns = nameServers(ctx);
    return {
      allapot: "kezi",
      uzenet:
        ns.length > 0
          ? `Állítsd be a következő nameservereket a regisztrátornál: ${ns.join(", ")}`
          : "Nincsenek elérhető nameserverek — előbb futtasd a Cloudflare zóna lépést.",
      meta: { name_servers: ns },
    };
  },

  async adoptal(ctx) {
    const zona = await cf(ctx).getZone(zonaId(ctx));
    if (zona.status !== "active") {
      throw new OrchestratorHiba(
        "ZONA_NEM_AKTIV",
        `A zóna státusza "${zona.status}" — az NS delegálás adoptálásához aktív zóna szükséges.`,
      );
    }
    return { allapot: "kesz", uzenet: "Zóna már aktív, NS delegálás kész." };
  },

  async ellenoriz(ctx) {
    const id = zonaId(ctx);
    await cf(ctx).triggerActivationCheck(id);
    const zona = await cf(ctx).getZone(id);
    const ok = zona.status === "active";
    return {
      ok,
      elteresek: ok ? [] : [`zone_status:${zona.status}`],
      uzenet: ok
        ? "A zóna aktív."
        : `A zóna státusza még "${zona.status}" — várj a DNS propagációra.`,
    };
  },
};

type Rekord = { type: "A" | "CNAME"; name: string; content: string };

function tervezettRekordok(ctx: LepesKontextus): Rekord[] {
  const { domain, dns, wwwAtiranyitas } = ctx.telepites;
  const rek: Rekord[] = [{ type: dns.rekordTipus, name: domain, content: dns.cel ?? "" }];
  if (wwwAtiranyitas) rek.push({ type: "CNAME", name: `www.${domain}`, content: domain });
  return rek;
}

export const dnsRekordokLepes: LepesKezelo = {
  kulcs: "dns_rekordok",

  async terv(ctx) {
    const rek = tervezettRekordok(ctx);
    return {
      osszegzes: `DNS rekordok létrehozása: ${rek.map((r) => `${r.type} ${r.name} -> ${r.content}`).join(", ")}`,
      valtoztatasok: rek.map((r) => ({
        szolgaltato: "cloudflare",
        muvelet: "dns_rekord_upsert",
        cel: r.name,
      })),
      figyelmeztetesek: ctx.telepites.dns.cel ? [] : ["Nincs megadva DNS cél (dns.cel)."],
    };
  },

  async vegrehajt(ctx) {
    if (!ctx.telepites.dns.cel) {
      throw new OrchestratorHiba("DNS_CEL_HIANYZIK", "Nincs megadva DNS cél (dns.cel).");
    }
    const zona = zonaId(ctx);
    const idk: string[] = [];
    for (const r of tervezettRekordok(ctx)) {
      const { id } = await cf(ctx).upsertDnsRecord(zona, {
        type: r.type,
        name: r.name,
        content: r.content,
        proxied: ctx.telepites.dns.proxied,
      });
      idk.push(id);
    }
    return {
      allapot: "kesz",
      kulsoId: idk[0] ?? null,
      uzenet: "DNS rekordok létrehozva/frissítve.",
      kulsoIdkPatch: { cloudflareDnsRekordIdk: idk },
    };
  },

  async adoptal(ctx, input) {
    const rekordok = await cf(ctx).listDnsRecords(zonaId(ctx));
    const talalat = rekordok.find((r) => r.id === input.kulsoId);
    if (!talalat) {
      throw new OrchestratorHiba(
        "REKORD_NINCS",
        "A megadott DNS rekord nem található a zónában.",
      );
    }
    return {
      allapot: "adoptalva",
      kulsoId: talalat.id,
      uzenet: "Meglévő DNS rekord hozzárendelve.",
      kulsoIdkPatch: { cloudflareDnsRekordIdk: [talalat.id] },
    };
  },

  async ellenoriz(ctx) {
    const rekordok = await cf(ctx).listDnsRecords(zonaId(ctx));
    const elteresek: string[] = [];
    for (const t of tervezettRekordok(ctx)) {
      const el = rekordok.find((r) => r.name === t.name && r.type === t.type);
      if (!el) elteresek.push(`dns.missing:${t.name}`);
      else if (el.content !== t.content) {
        elteresek.push(
          `dns.content_mismatch:${t.name} expected ${t.content} got ${el.content}`,
        );
      }
    }
    return {
      ok: elteresek.length === 0,
      elteresek,
      uzenet: elteresek.length === 0 ? "Rendben." : "Eltérés a DNS rekordokban.",
    };
  },
};
