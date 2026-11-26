/** DTO types of the facade (type-only — safe to import anywhere). */
import type {
  DnsTipus,
  HozzaferesTipus,
  OldalSema,
  StackAllapot,
  StackTipus,
  WebhelyTipus,
} from "./constants";

export type KonteinerSor = {
  id: string;
  nev: string;
  /** Compose service key (`com.docker.compose.service`). */
  szolgaltatas?: string;
  image: string;
  imageId?: string;
  allapot: string;
  statusz?: string;
  letrehozva?: string;
  portok: string[];
};

export type StackSor = {
  id: string;
  portainerId: number;
  nev: string;
  tipus: StackTipus;
  allapot: StackAllapot;
  konteneriSzam: number;
  futoSzam: number;
  imagek: string[];
  oldalSzam: number;
  partnerId?: string;
  partnerNev?: string;
  leiras?: string;
};

export type OldalRovid = {
  id: string;
  nev: string;
  hostnevek: string[];
  szolgaltatas: string;
  port: number;
  partnerId?: string;
  partnerNev?: string;
};

export type StackDetail = StackSor & {
  konteynerek: KonteinerSor[];
  oldalak: OldalRovid[];
  frissitve?: string;
  letrehozva?: string;
  endpointId?: number;
  webhook?: boolean;
};

export type StackFajl = {
  compose: string;
  env: Array<{ name: string; value: string }>;
};

export type OldalSor = OldalRovid & {
  stackId?: string;
  stackNev?: string;
  sema: OldalSema;
  websocket: boolean;
  sslKikenyszer: boolean;
  dns: { tipus?: DnsTipus; cel?: string; proxied: boolean };
  megjegyzes?: string;
  kulsoIdk: {
    npmProxyHostId?: number | null;
    npmTanusitvanyId?: number | null;
    cloudflareZonaId?: string | null;
  };
};

export type EllenorzesSzint = "ok" | "figyelmeztetes" | "hiba";
export type EllenorzesTetel = {
  kulcs: "dns" | "ssl" | "proxy" | "konteiner" | "elerheto";
  szint: EllenorzesSzint;
  uzenet: string;
};

export type LepesEredmeny = {
  kulcs: "dns" | "ssl" | "proxy";
  ok: boolean;
  uzenet: string;
};

export type SzinkronEredmeny = {
  stackek: { osszes: number; uj: number; elveszett: number };
  oldalak: { osszes: number; uj: number; frissitve: number; elveszett: number };
  figyelmeztetesek: string[];
};

export type Attekintes = {
  stackek: { osszes: number; fut: number; hibas: number; leallitva: number };
  konteinerek: { osszes: number; fut: number; problemas: KonteinerProblema[] };
  oldalak: { osszes: number; stacknelkul: number };
  tanusitvanyok: {
    osszes: number;
    lejarKozel: Array<{ id: number; nevek: string[]; napok: number }>;
  };
  arva: KonteinerSor[];
  integraciok: Array<{
    szolgaltato: string;
    cimke: string;
    ok?: boolean;
    uzenet?: string;
    ellenorzes?: string;
  }>;
  hibak: string[];
};

export type KonteinerProblema = KonteinerSor & { stackNev?: string; stackId?: string };

// ---------------------------------------------------------------- Sablonok

export type SablonSor = {
  id: string;
  nev: string;
  leiras?: string;
  tipus: StackTipus;
  szolgaltatasok: number;
  frissitve?: string;
};

export type SablonDetail = {
  id: string;
  nev: string;
  leiras?: string;
  tipus: StackTipus;
  compose: string;
  env: Array<{ name: string; value: string }>;
};

// ---------------------------------------------------------------- Webhelyek

export type HozzaferesSor = {
  id: string;
  webhelyId: string;
  tipus: HozzaferesTipus;
  cimke: string;
  host: string;
  port?: number;
  felhasznalo?: string;
  /** Only tells whether a password is stored — the value is never in a DTO. */
  vanJelszo: boolean;
  konyvtar?: string;
  url?: string;
  megjegyzes?: string;
};

export type WebhelySor = {
  id: string;
  nev: string;
  tipus: WebhelyTipus;
  hostnevek: string[];
  partnerId?: string;
  partnerNev?: string;
  tarhely?: string;
  lejarat?: string;
  hozzaferesSzam: number;
  utolsoEllenorzes?: {
    at: string;
    ok: boolean;
    statusz?: number;
    wordpress?: boolean;
    uzenet?: string;
  };
};

export type WebhelyDetail = WebhelySor & {
  megjegyzes?: string;
  hozzaferesek: HozzaferesSor[];
};
