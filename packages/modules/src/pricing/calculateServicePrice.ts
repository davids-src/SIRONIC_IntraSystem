import type {
  ServicePriceListItem,
  Contact,
  PricingSettings,
  CalculatedServicePrice,
  HourlyRateCategory,
} from "@crm/types";
import { mapContactToMultiplierKey } from "./mapContactToMultiplierKey";

/**
 * Kiszámítja a szolgáltatás végárát a partner szerződéstípusa és az árképzési
 * beállítások alapján. A sürgősségi szorzó opcionálisan alkalmazható (pl. munkalap).
 *
 * FONTOS: Az eredményt a dokumentum létrehozásakor snapshot-ként kell tárolni.
 * Ha a partner szerződéstípusa vagy a beállítások megváltoznak, a korábbi
 * dokumentumok ÁRA NEM MÓDOSUL.
 */
export async function calculateServicePrice(
  item: Pick<
    ServicePriceListItem,
    "pricing_type" | "internal_base_price" | "hourly_rate_category" | "unit_based_tiers"
  >,
  contact: Pick<
    Contact,
    | "partner_role"
    | "client_category"
    | "pricing_contract_type"
    | "subcontractor_presence_type"
  >,
  settings: PricingSettings,
  options?: {
    urgency?: keyof PricingSettings["urgency_multipliers"];
    unit_count?: number; // unit_based esetén a darabszám
  },
): Promise<CalculatedServicePrice> {
  // 1. Egyedi árajánlat – nincs kalkulált ár
  if (item.pricing_type === "custom") {
    return {
      internal_base_price: 0,
      client_multiplier: 1,
      calculated_price: 0,
      urgency_multiplier: 1,
      final_price: 0,
      pricing_type: "custom",
      is_custom: true,
    };
  }

  // 2. Belső alap ár meghatározása
  let base = 0;

  if (item.pricing_type === "hourly") {
    const rateKey = item.hourly_rate_category as HourlyRateCategory;
    const rawRate = settings.hourly_rates[rateKey] ?? 0;
    // Overhead szorzó alkalmazása, 100-ra kerekítve
    base = Math.round((rawRate * settings.overhead_multiplier) / 100) * 100;
  } else if (item.pricing_type === "unit_based") {
    const count = options?.unit_count ?? 0;
    const tiers = item.unit_based_tiers ?? [];
    // A megfelelő sáv megtalálása
    const tier = tiers.find(
      (t) => count >= t.min_units && (t.max_units == null || count <= t.max_units),
    );
    base = tier?.base_price ?? 0;
  } else {
    // fixed
    base = item.internal_base_price ?? 0;
  }

  // 3. Ügyfél szorzó a partner szerződéstípusa alapján
  const multiplierKey = mapContactToMultiplierKey(contact);
  const clientMultiplier = settings.client_multipliers[multiplierKey] ?? 1.0;

  // 4. Végár = alap × ügyfél szorzó, 100-ra kerekítve
  const calculatedPrice = Math.round((base * clientMultiplier) / 100) * 100;

  // 5. Sürgősségi szorzó (ha van)
  const urgencyMultiplier = options?.urgency
    ? (settings.urgency_multipliers[options.urgency] ?? 1.0)
    : 1.0;

  const finalPrice = Math.round((calculatedPrice * urgencyMultiplier) / 100) * 100;

  return {
    internal_base_price: base,
    client_multiplier: clientMultiplier,
    calculated_price: calculatedPrice,
    urgency_multiplier: urgencyMultiplier,
    final_price: finalPrice,
    pricing_type: item.pricing_type,
    is_custom: false,
  };
}
