import type { LepesKulcs } from "../constants";
import { imageEpitesLepes, stackInditasLepes, stackLetrehozasLepes } from "./build";
import { cloudflareZonaLepes, dnsRekordokLepes, nsDelegalasLepes } from "./cloudflare";
import { proxyHostLepes, sslTanusitvanyLepes } from "./npm";
import type { LepesKezelo } from "./tipusok";

export const LEPES_REGISZTER: Record<LepesKulcs, LepesKezelo> = {
  cloudflare_zona: cloudflareZonaLepes,
  ns_delegalas: nsDelegalasLepes,
  dns_rekordok: dnsRekordokLepes,
  ssl_tanusitvany: sslTanusitvanyLepes,
  proxy_host: proxyHostLepes,
  image_epites: imageEpitesLepes,
  stack_letrehozas: stackLetrehozasLepes,
  stack_inditas: stackInditasLepes,
};

export * from "./tipusok";
