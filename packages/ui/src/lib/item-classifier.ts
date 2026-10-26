/**
 * Intelligens segédfüggvény annak meghatározására, hogy egy árajánlat/bizonylat tétel
 * szolgáltatás / munkadíj vagy fizikai termék jellegű.
 */
export function isServiceItem(item: {
  line_type?: string | null;
  service_price_list_item_id?: string | null;
  unit?: string | null;
  description?: string | null;
}): boolean {
  if (!item) return false;

  // 1. Explicit típus megjelölés
  if (item.line_type === "service" || item.line_type === "labor") {
    return true;
  }

  // 2. Szolgáltatás árlistából származó tétel azonosító
  if (item.service_price_list_item_id) {
    return true;
  }

  // 3. Mértékegység alapján (idő / projekt / szolgáltatási egységek)
  const unit = (item.unit || "").toLowerCase().trim();
  const serviceUnits = new Set([
    "óra",
    "ora",
    "h",
    "hr",
    "hours",
    "alkalom",
    "alk",
    "nap",
    "napok",
    "mérnöknap",
    "mernoknap",
    "projekt",
    "hó",
    "ho",
    "hónap",
    "honap",
    "fő",
    "fo",
    "fő/óra",
    "fo/ora",
  ]);
  if (serviceUnits.has(unit)) {
    return true;
  }

  // 4. Szöveges kulcsszavak a megnevezésben (ékezet- és kis/nagybetű-függetlenül)
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const desc = normalize(item.description || "");

  const serviceKeywords = [
    "munkadij",
    "telepites",
    "szereles",
    "beallitas",
    "konfiguralas",
    "karbantartas",
    "fejlesztes",
    "oktatas",
    "kiszallas",
    "felmeres",
    "tervezes",
    "uzemeltetes",
    "tamogatas",
    "support",
    "kabelezes",
    "szolgaltatas",
    "tisztitas",
    "javitas",
    "oradij",
    "napidij",
    "szerviz",
    "kiepites",
    "bontas",
    "audit",
    "tanacsadas",
    "programozas",
    "atvizsgalas",
    "teszteles",
    "üzembe helyezés",
    "uzembe helyezes",
  ];

  if (serviceKeywords.some((kw) => desc.includes(kw))) {
    return true;
  }

  return false;
}
