import { IntegrationError } from "@erp/integrations";
import {
  kliens,
  lepesAdat,
  OrchestratorHiba,
  type LepesKezelo,
  type LepesKontextus,
} from "./tipusok";

const npm = (ctx: LepesKontextus) => kliens(ctx.kliensek, "npm");

/** CVE-2024-39935: no certificate/proxy mutation below this NPM version. */
const MIN_NPM_VERZIO = "2.11.3";

const domainek = (ctx: LepesKontextus): string[] =>
  ctx.telepites.wwwAtiranyitas
    ? [ctx.telepites.domain, `www.${ctx.telepites.domain}`]
    : [ctx.telepites.domain];

const fedi = (cert: string, domain: string) =>
  cert === domain || (cert.startsWith("*.") && domain.endsWith(cert.slice(1)));

function tanusitvanyId(ctx: LepesKontextus): number {
  const id = lepesAdat(ctx.telepites, "ssl_tanusitvany").kulsoId;
  if (!id) {
    throw new OrchestratorHiba(
      "TANUSITVANY_NEM_KESZ",
      "Az SSL tanúsítvány lépés még nincs kész.",
    );
  }
  return Number(id);
}

export const sslTanusitvanyLepes: LepesKezelo = {
  kulcs: "ssl_tanusitvany",

  async terv(ctx) {
    return {
      osszegzes: `Let's Encrypt tanúsítvány igénylése (DNS-01, Cloudflare): ${domainek(ctx).join(", ")}`,
      valtoztatasok: [
        {
          szolgaltato: "npm",
          muvelet: "tanusitvany_letrehozas",
          cel: ctx.telepites.domain,
        },
      ],
      figyelmeztetesek: [
        `Az NPM verziójának legalább ${MIN_NPM_VERZIO}-nak kell lennie (CVE-2024-39935).`,
      ],
    };
  },

  async vegrehajt(ctx, input) {
    const kliensNpm = npm(ctx);
    await kliensNpm.assertMinVersion(MIN_NPM_VERZIO);
    const hitelesito = input?.dns_provider_credentials;
    if (typeof hitelesito !== "string" || hitelesito.length === 0) {
      throw new OrchestratorHiba(
        "DNS_TOKEN_HIANYZIK",
        "Hiányzik az NPM DNS-01 Cloudflare token (dns_provider_credentials).",
      );
    }
    const cert = await kliensNpm.createCertificate({
      domainNames: domainek(ctx),
      dnsProviderCredentials: hitelesito,
      letsencryptEmail:
        (input?.letsencrypt_email as string | undefined) ?? "ops@sironic.eu",
    });
    return {
      allapot: "kesz",
      kulsoId: String(cert.id),
      uzenet: "SSL tanúsítvány létrehozva.",
      kulsoIdkPatch: { npmTanusitvanyId: cert.id },
    };
  },

  async adoptal(ctx, input) {
    const certek = await npm(ctx).listCertificates();
    const id = Number(input.kulsoId);
    const talalat = certek.find((c) => c.id === id);
    if (!talalat || !talalat.domain_names.some((d) => fedi(d, ctx.telepites.domain))) {
      throw new OrchestratorHiba(
        "TANUSITVANY_ELTERES",
        "A megadott tanúsítvány nem fedi le a telepítés domainjét.",
      );
    }
    return {
      allapot: "adoptalva",
      kulsoId: String(talalat.id),
      uzenet: "Meglévő tanúsítvány hozzárendelve.",
      kulsoIdkPatch: { npmTanusitvanyId: talalat.id },
    };
  },

  async ellenoriz(ctx) {
    const l = lepesAdat(ctx.telepites, "ssl_tanusitvany");
    if (!l.kulsoId) {
      return {
        ok: false,
        elteresek: ["missing_certificate_id"],
        uzenet: "Nincs hozzárendelt tanúsítvány.",
      };
    }
    try {
      const certek = await npm(ctx).listCertificates();
      const talalat = certek.find((c) => c.id === Number(l.kulsoId));
      if (!talalat) {
        return {
          ok: false,
          elteresek: ["certificate_not_found"],
          uzenet: "A tanúsítvány nem található.",
        };
      }
      const ok = talalat.domain_names.some((d) => fedi(d, ctx.telepites.domain));
      return {
        ok,
        elteresek: ok ? [] : ["certificate.domain_mismatch"],
        uzenet: ok ? "Rendben." : "Domain eltérés.",
      };
    } catch (err) {
      if (err instanceof IntegrationError) {
        return { ok: false, elteresek: ["npm_error"], uzenet: err.safeMessage };
      }
      throw err;
    }
  },
};

export const proxyHostLepes: LepesKezelo = {
  kulcs: "proxy_host",

  async terv(ctx) {
    const { celHost, celPort } = ctx.telepites.proxy;
    return {
      osszegzes: `Proxy host létrehozása: ${domainek(ctx).join(", ")} -> ${celHost}:${celPort}`,
      valtoztatasok: [
        {
          szolgaltato: "npm",
          muvelet: "proxy_host_letrehozas",
          cel: ctx.telepites.domain,
        },
      ],
      figyelmeztetesek: celHost && celPort ? [] : ["Hiányzik a célhost/célport."],
    };
  },

  async vegrehajt(ctx) {
    const { celHost, celPort, celSema, websocket } = ctx.telepites.proxy;
    if (!celHost || !celPort) {
      throw new OrchestratorHiba("PROXY_CEL_HIANYZIK", "Hiányzik a célhost/célport.");
    }
    const bemenet = {
      domainNames: domainek(ctx),
      forwardScheme: celSema,
      forwardHost: celHost,
      forwardPort: celPort,
      certificateId: tanusitvanyId(ctx),
      allowWebsocketUpgrade: websocket,
    };
    // Re-running must update the existing host: NPM rejects a second host for the same domain.
    const letezo = ctx.telepites.kulsoIdk.npmProxyHostId;
    if (letezo) {
      await npm(ctx).updateProxyHost(Number(letezo), bemenet);
      return {
        allapot: "kesz",
        kulsoId: String(letezo),
        uzenet: "Proxy host frissítve.",
        kulsoIdkPatch: { npmProxyHostId: letezo },
      };
    }
    const host = await npm(ctx).createProxyHost(bemenet);
    return {
      allapot: "kesz",
      kulsoId: String(host.id),
      uzenet: "Proxy host létrehozva.",
      kulsoIdkPatch: { npmProxyHostId: host.id },
    };
  },

  async adoptal(ctx, input) {
    const host = await npm(ctx).getProxyHost(Number(input.kulsoId));
    if (!host.domain_names.includes(ctx.telepites.domain)) {
      throw new OrchestratorHiba(
        "HOST_ELTERES",
        "A proxy host nem tartalmazza a telepítés domainjét.",
      );
    }
    return {
      allapot: "adoptalva",
      kulsoId: String(host.id),
      uzenet: "Meglévő proxy host hozzárendelve.",
      kulsoIdkPatch: { npmProxyHostId: host.id },
    };
  },

  async ellenoriz(ctx) {
    const l = lepesAdat(ctx.telepites, "proxy_host");
    if (!l.kulsoId) {
      return {
        ok: false,
        elteresek: ["missing_proxy_host_id"],
        uzenet: "Nincs proxy host.",
      };
    }
    try {
      const host = await npm(ctx).getProxyHost(Number(l.kulsoId));
      const elteresek: string[] = [];
      if (host.forward_host !== ctx.telepites.proxy.celHost)
        elteresek.push("proxy.forward_host_mismatch");
      if (host.forward_port !== ctx.telepites.proxy.celPort)
        elteresek.push("proxy.forward_port_mismatch");
      return {
        ok: elteresek.length === 0,
        elteresek,
        uzenet: elteresek.length === 0 ? "Rendben." : "Eltérés található.",
      };
    } catch (err) {
      if (err instanceof IntegrationError) {
        return { ok: false, elteresek: ["npm_error"], uzenet: err.safeMessage };
      }
      throw err;
    }
  },
};
