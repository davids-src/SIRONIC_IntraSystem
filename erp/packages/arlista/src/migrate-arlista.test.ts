import { describe, expect, it } from "vitest";
import {
  mapPriceListItem,
  mapPricingSettings,
  planArlistaMigration,
  type ArlistaMigrationInput,
} from "../../../scripts/migrate/arlista";
import {
  ALAP_ARAZASI_BEALLITASOK,
  ANYAG_POTLEK_KULCSOK,
  ORADIJ_KATEGORIAK,
  SURGOSSEG_KULCSOK,
  UGYFEL_SZORZO_KULCSOK,
} from "./constants";

const legacyBeallitasok = {
  overhead_multiplier: 1.45,
  monthly_fixed_cost: 500000,
  monthly_productive_hours: 160,
  hourly_rates: {
    it_operations: 5500,
    it_development: 7500,
    security_tech_installer: 5000,
    security_tech_planner: 6500,
    fire_protection_installer: 5000,
    fire_protection_planner: 6500,
    electrical_general: 5500,
    electrical_industrial: 6500,
    project_management: 7000,
    consulting: 8000,
  },
  client_multipliers: {
    individual: 1.3,
    smb_occasional: 1.2,
    smb_6month: 1.08,
    smb_1year: 1.0,
    smb_2year: 0.92,
    enterprise: 0.88,
    subcontractor_presence: 0.75,
    subcontractor_project: 0.8,
    pm_external: 0.9,
  },
  material_surcharges: { occasional: 0.12, contracted: 0.08, enterprise: 0.06, subcontractor: 0.05 },
  urgency_multipliers: { same_day: 1.3, after_hours: 1.5, weekend: 1.75, night: 2.0 },
  vat_rate: 0.27,
  min_callout_fee: 15000,
  min_project_fee: 50000,
};

const bemenet: ArlistaMigrationInput = {
  priceListItems: [
    {
      item_number: "HW-0001",
      type: "product",
      name: "Switch",
      category: "Hálózat",
      unit: "db",
      net_price: 50000,
      currency: "HUF",
      tax_rate: 27,
      is_active: true,
      purchase_records: [
        {
          supplier_name: "Beszállító Kft.",
          net_purchase_price: 30000,
          purchased_at: "2026-01-10",
        },
      ],
      last_purchase_price: 30000,
      preferred_supplier: "Beszállító Kft.",
    },
  ],
  serviceCategories: [{ _id: "c1", name: "IT", sku_prefix: "it", sort_order: 1 }],
  serviceSubCategories: [
    { _id: "s1", category_id: "c1", name: "Szerver" },
    { _id: "s2", category_id: "nincs", name: "Árva" },
  ],
  servicePriceListItems: [
    {
      category_id: "c1",
      subcategory_id: "s1",
      sku: "IT-0001",
      name: "Karbantartás",
      unit: "óra",
      pricing_type: "hourly",
      hourly_rate_category: "it_operations",
    },
    {
      category_id: "c1",
      sku: "IT-0002",
      name: "Sávos",
      unit: "db",
      pricing_type: "unit_based",
      unit_based_tiers: [{ label: "1–10", min_units: 1, max_units: null, base_price: 100 }],
      is_archived: true,
      is_active: true,
      archive_reason: "elavult",
    },
    { category_id: "ismeretlen", sku: "X-1", name: "Árva", unit: "db", pricing_type: "custom" },
  ],
  pricingSettings: legacyBeallitasok,
};

describe("arlista migráció — leképezés", () => {
  it("a termék mezői magyar azonosítókra képződnek, tenantId nélkül", () => {
    const m = mapPriceListItem(bemenet.priceListItems[0]!);
    expect(m).toMatchObject({
      kod: "HW-0001",
      tipus: "termek",
      nettoAr: 50000,
      afaKulcs: 27,
      utolsoBeszerzesiAr: 30000,
      elonyosBeszallito: "Beszállító Kft.",
      archivalt: false,
    });
    expect(m.beszerzesiAdatok[0]).toMatchObject({ beszallitoNev: "Beszállító Kft.", nettoBeszerzesiAr: 30000 });
    expect(m.beszerzesiAdatok[0]?.beszerzesDatuma).toBeInstanceOf(Date);
    expect("tenantId" in m).toBe(false);
  });

  it("a beállítások kulcsai pontosan a modul kulcskészletére képződnek", () => {
    const { ertek, figyelmeztetesek } = mapPricingSettings(legacyBeallitasok);
    expect(figyelmeztetesek).toEqual([]);
    expect(Object.keys(ertek.oradijak).sort()).toEqual([...ORADIJ_KATEGORIAK].sort());
    expect(Object.keys(ertek.ugyfelSzorzok).sort()).toEqual([...UGYFEL_SZORZO_KULCSOK].sort());
    expect(Object.keys(ertek.anyagPotlekok).sort()).toEqual([...ANYAG_POTLEK_KULCSOK].sort());
    expect(Object.keys(ertek.surgossegiSzorzok).sort()).toEqual([...SURGOSSEG_KULCSOK].sort());
    // Az alapértékek egyeznek a modul alapértelmezésével.
    expect(ertek.ugyfelSzorzok).toEqual(ALAP_ARAZASI_BEALLITASOK.ugyfelSzorzok);
    expect(ertek.oradijak).toEqual(ALAP_ARAZASI_BEALLITASOK.oradijak);
  });

  it("ismeretlen beállításkulcsot jelent, nem dob el csendben", () => {
    const { figyelmeztetesek } = mapPricingSettings({
      ...legacyBeallitasok,
      urgency_multipliers: { ...legacyBeallitasok.urgency_multipliers, holiday: 3 },
    });
    expect(figyelmeztetesek).toHaveLength(1);
  });
});

describe("arlista migráció — terv", () => {
  const terv = planArlistaMigration(bemenet);

  it("természetes kulccsal upsertel (idempotens újrafuttatás)", () => {
    const masodik = planArlistaMigration(bemenet);
    expect(masodik).toEqual(terv);
    const kulcsok = terv.muveletek.map((m) => `${m.kollekcio}:${JSON.stringify(m.kulcs)}`);
    expect(new Set(kulcsok).size).toBe(kulcsok.length);
    expect(kulcsok).toContain('arlista_szolgaltatas_kategoriak:{"kodElotag":"IT"}');
    expect(kulcsok).toContain('arlista_arazasi_beallitasok:{"kulcs":"alap"}');
  });

  it("a hivatkozást az előtagon át oldja fel, az árva tételeket jelenti", () => {
    expect(terv.figyelmeztetesek).toHaveLength(2);
    const szolg = terv.muveletek.filter((m) => m.kollekcio === "arlista_szolgaltatas_tetelek");
    expect(szolg).toHaveLength(2);
    expect(szolg[0]?.ertek).toMatchObject({
      kategoriaKodElotag: "IT",
      alkategoria: { kategoriaKodElotag: "IT", nev: "Szerver" },
      arazasiTipus: "oradij",
      oradijKategoria: "it_uzemeltetes",
    });
  });

  it("archivált szolgáltatás inaktív és megtartja az okot", () => {
    const szolg = terv.muveletek.find((m) => (m.kulcs as { kod?: string }).kod === "IT-0002");
    expect(szolg?.ertek).toMatchObject({
      arazasiTipus: "egysegalapu",
      archivalt: true,
      aktiv: false,
      archivalasOka: "elavult",
    });
  });
});
