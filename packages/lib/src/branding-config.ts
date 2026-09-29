import type { CompanyDetails } from "@crm/types";

export const DEFAULT_SIROTECH_COMPANY_DETAILS: CompanyDetails = {
  name: "SIROTECH Kft.",
  legal_name: "SIROTECH Kereskedelmi és Szolgáltató Kft.",
  display_brand: "SIROTECH",
  logo_url: "/logo.png",
  primary_color: "#c41230",
  accent_color: "#1e293b",
  headquarters: "8000 Székesfehérvár, Berényi út 72-100.",
  tax_number: "26789123-2-07",
  registration_number: "07-09-030123",
  bank_account: "11736006-20000000-00000000",
  iban: "HU42117360062000000000000000",
  website: "https://sirotech.hu",
  email: "info@sirotech.hu",
  phone: "+36 22 123 456",
  email_from_name: "SIROTECH Vállalatirányítás",
  email_from_address: "rendszer@sirotech.hu",
  email_reply_to: "info@sirotech.hu",
  business_units: [
    "SIROTECH",
    "SIRONIC",
    "IT Fehérvár",
    "Kamera Fehérvár",
    "ElektroPlus",
  ],
};

export function getCompanyBranding(
  customDetails?: Partial<CompanyDetails> | null,
): CompanyDetails {
  return {
    ...DEFAULT_SIROTECH_COMPANY_DETAILS,
    ...(customDetails || {}),
    business_units: customDetails?.business_units?.length
      ? customDetails.business_units
      : DEFAULT_SIROTECH_COMPANY_DETAILS.business_units,
  };
}
