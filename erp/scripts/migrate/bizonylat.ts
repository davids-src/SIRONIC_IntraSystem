/**
 * Legacy `DeliveryNote` / `CompletionCertificate` / `Invoice` / `WarrantyCard` → `@erp/bizonylat`
 * mapping (skeleton).
 *
 * Pure functions only: no DB connection, no env access. The caller (a future runner) loads the
 * legacy documents plus id-maps (legacy contact id → new partner id, price-list item id → new
 * árlista id), passes them in and persists the returned plain objects. `tenantId` is dropped.
 * Rows that cannot be mapped faithfully are reported in `figyelmeztetesek` instead of guessed.
 *
 * Counters: the runner must seed `bizonylat:szallitolevel|igazolas|szamla|jotallas` above the
 * highest imported number (`maxSzamok` in the plan). Legacy numbers are kept in `regiSzam`.
 * Signed certificates keep their signature; legacy magic-link tokens are NOT carried over
 * (sent-but-unsigned certificates get no token; resend after cutover).
 */
import type {
  IgazolasAllapot,
  JotallasTaroltAllapot,
  SzallitolevelAllapot,
  SzamlaTaroltAllapot,
} from "../../packages/bizonylat/src/constants";
import { sorokOsszesites, evekHozzaad } from "../../packages/bizonylat/src/szamitas";

export type IdMap = ReadonlyMap<string, string> | Readonly<Record<string, string>>;
const kulcs = (m: IdMap, k?: string | null): string | undefined =>
  k ? (m instanceof Map ? m.get(k) : (m as Record<string, string>)[k]) : undefined;
const datum = (d?: Date | string | null): Date | undefined => {
  if (!d) return undefined;
  const x = d instanceof Date ? d : new Date(d);
  return Number.isNaN(x.getTime()) ? undefined : x;
};
const nap = (d?: Date | string | null) => datum(d)?.toISOString().slice(0, 10);
const szam = (s?: string | null) => {
  const m = /(\d+)\s*$/.exec(s ?? "");
  return m ? Number(m[1]) : 0;
};

const SZL_ALLAPOT: Record<string, SzallitolevelAllapot> = {
  draft: "piszkozat",
  issued: "kiadva",
  cancelled: "sztorno",
};
const IG_ALLAPOT: Record<string, IgazolasAllapot> = {
  draft: "piszkozat",
  sent: "elkuldve",
  accepted: "elfogadva",
  rejected: "elutasitva",
};
const SZAMLA_ALLAPOT: Record<string, SzamlaTaroltAllapot> = {
  draft: "piszkozat",
  sent: "elkuldve",
  paid: "kifizetve",
  // `overdue` is computed lazily now: stored as sent, the due date decides.
  overdue: "elkuldve",
  cancelled: "sztorno",
};
const JJY_ALLAPOT: Record<string, JotallasTaroltAllapot> = {
  active: "aktiv",
  // `expired` is computed lazily now (kept active, the end date decides).
  expired: "aktiv",
  claimed: "igenyelt",
  void: "ervenytelen",
};

export type LegacyDeliveryNote = {
  _id: string;
  delivery_number: string;
  contact_id: string;
  project_id?: string | null;
  status?: string;
  issue_date: Date | string;
  lines?: Array<{
    price_list_item_id: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
  notes?: string | null;
  is_archived?: boolean;
  archive_reason?: string | null;
};

export function mapSzallitolevel(
  l: LegacyDeliveryNote,
  partnerek: IdMap,
  termekek: IdMap,
  w: string[],
) {
  const partnerId = kulcs(partnerek, l.contact_id);
  if (!partnerId) {
    w.push(`Szállítólevél ${l.delivery_number}: ismeretlen partner (${l.contact_id})`);
    return null;
  }
  const allapot = SZL_ALLAPOT[l.status ?? "draft"];
  if (!allapot) {
    w.push(`Szállítólevél ${l.delivery_number}: ismeretlen állapot (${l.status})`);
    return null;
  }
  const sorok = (l.lines ?? []).flatMap((s) => {
    const t = kulcs(termekek, s.price_list_item_id);
    if (!t) {
      w.push(
        `Szállítólevél ${l.delivery_number}: ismeretlen termék (${s.price_list_item_id})`,
      );
      return [];
    }
    return [{ arlistaTermekId: t, nev: s.name, mennyiseg: s.quantity, egyseg: s.unit }];
  });
  // Issued legacy notes already deducted stock in the old system: never replay the stock-out.
  return {
    regiId: l._id,
    regiSzam: l.delivery_number,
    partnerId,
    projektId: l.project_id ?? undefined,
    kiadasNap: nap(l.issue_date) ?? "1970-01-01",
    sorok,
    megjegyzes: l.notes ?? undefined,
    allapot,
    keszletKiadas:
      allapot === "kiadva"
        ? ({ allapot: "kesz", uzenet: "Migrált (régi rendszerben levonva)" } as const)
        : undefined,
    archivalt: Boolean(l.is_archived),
    archivalasOka: l.archive_reason ?? undefined,
  };
}

export type LegacyCertificate = {
  _id: string;
  certificate_number: string;
  contact_id?: string | null;
  project_id?: string | null;
  offer_id?: string | null;
  status: string;
  worklog_ids?: string[];
  title: string;
  work_summary: string;
  work_period_start?: Date | string | null;
  work_period_end?: Date | string | null;
  total_hours?: number | null;
  client_name?: string | null;
  client_title?: string | null;
  client_signature?: string | null;
  signed_at?: Date | string | null;
  recipient_email?: string | null;
  rejection_reason?: string | null;
  is_archived?: boolean;
  archive_reason?: string | null;
  lines?: Array<{
    description: string;
    quantity: number;
    unit: string;
    net_unit_price?: number;
  }>;
};

export function mapIgazolas(l: LegacyCertificate, partnerek: IdMap, w: string[]) {
  const partnerId = kulcs(partnerek, l.contact_id);
  if (!partnerId) {
    w.push(`Igazolás ${l.certificate_number}: ismeretlen partner (${l.contact_id})`);
    return null;
  }
  const allapot = IG_ALLAPOT[l.status];
  if (!allapot) {
    w.push(`Igazolás ${l.certificate_number}: ismeretlen állapot (${l.status})`);
    return null;
  }
  const sorok = (l.lines ?? []).map((s) => ({
    leiras: s.description,
    mennyiseg: s.quantity,
    egyseg: s.unit,
    nettoEgysegar: s.net_unit_price ?? 0,
    afaKulcs: 27,
  }));
  if (sorok.length > 0)
    w.push(
      `Igazolás ${l.certificate_number}: az ÁFA-kulcs 27%-ra állítva (a régi tétel nem tárolta)`,
    );
  let alairas: { nev: string; beosztas: string; kep: string; alairtAt: Date } | undefined;
  if (allapot === "elfogadva") {
    const at = datum(l.signed_at);
    if (l.client_name && l.client_signature && at)
      alairas = {
        nev: l.client_name,
        beosztas: l.client_title ?? "",
        kep: l.client_signature,
        alairtAt: at,
      };
    else
      w.push(
        `Igazolás ${l.certificate_number}: elfogadott, de az aláírás adatai hiányosak`,
      );
  }
  return {
    regiId: l._id,
    regiSzam: l.certificate_number,
    cim: l.title,
    partnerId,
    partnerEmail: l.recipient_email ?? undefined,
    projektId: l.project_id ?? undefined,
    ajanlatId: l.offer_id ?? undefined,
    munkalapIds: l.worklog_ids ?? [],
    forras: "kezi" as const,
    munkaOsszegzes: l.work_summary,
    idoszakKezdet: datum(l.work_period_start),
    idoszakVege: datum(l.work_period_end),
    osszOra: l.total_hours ?? undefined,
    sorok,
    osszegek: sorokOsszesites(sorok),
    allapot,
    alairas,
    elutasitasOka: l.rejection_reason ?? undefined,
    archivalt: Boolean(l.is_archived),
    archivalasOka: l.archive_reason ?? undefined,
  };
}

export type LegacyInvoice = {
  _id: string;
  invoice_number: string;
  contact_id: string;
  title?: string | null;
  total_amount: number;
  currency: string;
  status: string;
  issued_at?: Date | string | null;
  due_at?: Date | string | null;
};

export function mapSzamla(l: LegacyInvoice, partnerek: IdMap, w: string[]) {
  const partnerId = kulcs(partnerek, l.contact_id);
  if (!partnerId) {
    w.push(`Számla ${l.invoice_number}: ismeretlen partner (${l.contact_id})`);
    return null;
  }
  const allapot = SZAMLA_ALLAPOT[l.status];
  if (!allapot) {
    w.push(`Számla ${l.invoice_number}: ismeretlen állapot (${l.status})`);
    return null;
  }
  w.push(
    `Számla ${l.invoice_number}: a régi rekord nem tárolt tételeket — egy összegző sor készül, a Billingo-hivatkozást pótolni kell`,
  );
  return {
    regiId: l._id,
    szamlaszam: l.invoice_number,
    partnerId,
    cim: l.title ?? undefined,
    sorok: [
      {
        leiras: l.title ?? "Migrált számla",
        mennyiseg: 1,
        egyseg: "db",
        nettoEgysegar: l.total_amount,
        afaKulcs: 0,
      },
    ],
    osszeg: l.total_amount,
    penznem: l.currency,
    kiallitva: datum(l.issued_at),
    esedekes: datum(l.due_at),
    allapot,
  };
}

export type LegacyWarranty = {
  _id: string;
  warranty_number: string;
  contact_id: string;
  invoice_number?: string | null;
  issue_date: Date | string;
  lines?: Array<{
    price_list_item_id?: string | null;
    name: string;
    serial_number?: string | null;
    warranty_years: number;
    warranty_start: Date | string;
    warranty_end?: Date | string;
  }>;
  notes?: string | null;
  status?: string;
  is_archived?: boolean;
  archive_reason?: string | null;
};

export function mapJotallas(
  l: LegacyWarranty,
  partnerek: IdMap,
  termekek: IdMap,
  jogiSzoveg: string,
  w: string[],
) {
  const partnerId = kulcs(partnerek, l.contact_id);
  if (!partnerId) {
    w.push(`Jótállás ${l.warranty_number}: ismeretlen partner (${l.contact_id})`);
    return null;
  }
  const allapot = JJY_ALLAPOT[l.status ?? "active"];
  if (!allapot) {
    w.push(`Jótállás ${l.warranty_number}: ismeretlen állapot (${l.status})`);
    return null;
  }
  const sorok = (l.lines ?? []).flatMap((s) => {
    const kezdet = datum(s.warranty_start);
    if (!kezdet) {
      w.push(`Jótállás ${l.warranty_number}: hiányzó kezdet (${s.name})`);
      return [];
    }
    return [
      {
        termekNev: s.name,
        arlistaTermekId: kulcs(termekek, s.price_list_item_id),
        gyariSzam: s.serial_number ?? undefined,
        evek: s.warranty_years,
        kezdet,
        vege: datum(s.warranty_end) ?? evekHozzaad(kezdet, s.warranty_years),
      },
    ];
  });
  return {
    regiId: l._id,
    regiSzam: l.warranty_number,
    partnerId,
    szamlaszam: l.invoice_number ?? undefined,
    kiallitasNap: nap(l.issue_date) ?? "1970-01-01",
    sorok,
    megjegyzes: l.notes ?? undefined,
    // Legal text is frozen per card; migrated cards get the text valid at cutover.
    jogiSzoveg,
    lejarat: sorok.length
      ? new Date(Math.max(...sorok.map((s) => s.vege.getTime())))
      : undefined,
    allapot,
    archivalt: Boolean(l.is_archived),
    archivalasOka: l.archive_reason ?? undefined,
  };
}

export type BizonylatMigraciosBemenet = {
  szallitolevelek: LegacyDeliveryNote[];
  igazolasok: LegacyCertificate[];
  szamlak: LegacyInvoice[];
  jotallasok: LegacyWarranty[];
  /** legacy contact id → new partner id */
  partnerek: IdMap;
  /** legacy price-list item id → new árlista id */
  termekek: IdMap;
  jogiSzoveg: string;
};

export function migraljBizonylat(input: BizonylatMigraciosBemenet) {
  const figyelmeztetesek: string[] = [];
  const nem = <T>(x: T | null): x is T => x !== null;
  const maxSzam = (xs: string[]) => Math.max(0, ...xs.map(szam));
  return {
    szallitolevelek: input.szallitolevelek
      .map((l) => mapSzallitolevel(l, input.partnerek, input.termekek, figyelmeztetesek))
      .filter(nem),
    igazolasok: input.igazolasok
      .map((l) => mapIgazolas(l, input.partnerek, figyelmeztetesek))
      .filter(nem),
    szamlak: input.szamlak
      .map((l) => mapSzamla(l, input.partnerek, figyelmeztetesek))
      .filter(nem),
    jotallasok: input.jotallasok
      .map((l) =>
        mapJotallas(
          l,
          input.partnerek,
          input.termekek,
          input.jogiSzoveg,
          figyelmeztetesek,
        ),
      )
      .filter(nem),
    maxSzamok: {
      "bizonylat:szallitolevel": maxSzam(
        input.szallitolevelek.map((l) => l.delivery_number),
      ),
      "bizonylat:igazolas": maxSzam(input.igazolasok.map((l) => l.certificate_number)),
      "bizonylat:szamla": 0,
      "bizonylat:jotallas": maxSzam(input.jotallasok.map((l) => l.warranty_number)),
    },
    figyelmeztetesek,
  };
}
