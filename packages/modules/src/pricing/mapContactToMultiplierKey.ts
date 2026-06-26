import type { Contact, PricingSettingsClientMultipliers } from "@crm/types";

/**
 * A partner adatai alapján meghatározza az árképzési szorzó kulcsát.
 * Ez a kulcs a PricingSettings.client_multipliers objektum egyik property-je.
 */
export function mapContactToMultiplierKey(
  contact: Pick<
    Contact,
    | "partner_role"
    | "client_category"
    | "pricing_contract_type"
    | "subcontractor_presence_type"
  >,
): keyof PricingSettingsClientMultipliers {
  // Alvállalkozói megbízó eset
  if (contact.partner_role === "subcontractor_employer") {
    return contact.subcontractor_presence_type === "daily_presence"
      ? "subcontractor_presence"
      : "subcontractor_project";
  }

  // Magánszemély
  if (contact.client_category === "individual") {
    return "individual";
  }

  // Nagyvállalat
  if (contact.client_category === "enterprise") {
    return "enterprise";
  }

  // KKV – szerződéshossz alapján
  const contractMap: Record<string, keyof PricingSettingsClientMultipliers> = {
    occasional: "smb_occasional",
    "6month": "smb_6month",
    "1year": "smb_1year",
    "2year": "smb_2year",
  };

  const contractType = contact.pricing_contract_type ?? "occasional";
  return contractMap[contractType] ?? "smb_occasional";
}
