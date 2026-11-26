import { INTEGRACIO_LABELS, INTEGRACIO_SZOLGALTATOK } from "@erp/infra/client";
import type { MezoSzekcio } from "./mezo-form";

export function integracioSzekciok(
  szolgaltato: string,
  szerkesztes: boolean,
): MezoSzekcio[] {
  const hitel: Record<
    string,
    Array<{ name: string; label: string; password?: boolean }>
  > = {
    cloudflare: [{ name: "h_api_token", label: "API token", password: true }],
    npm: [
      { name: "h_email", label: "E-mail" },
      { name: "h_password", label: "Jelszó", password: true },
    ],
    portainer: [{ name: "h_api_key", label: "API kulcs", password: true }],
    github: [{ name: "h_token", label: "Token", password: true }],
  };
  return [
    {
      title: "Kapcsolat",
      mezok: [
        {
          name: "szolgaltato",
          label: "Szolgáltató",
          type: "select",
          options: INTEGRACIO_SZOLGALTATOK.map((s) => ({
            value: s,
            label: INTEGRACIO_LABELS[s],
          })),
        },
        { name: "cimke", label: "Címke", required: true },
        { name: "alapUrl", label: "Alap URL", required: true },
        { name: "aktiv", label: "Aktív", type: "checkbox" },
      ],
    },
    {
      title: "Hitelesítő adatok",
      description: szerkesztes
        ? "A tárolt adatok nem láthatók. Hagyd üresen, ami nem változik. A szolgáltató módosításához új kapcsolat kell."
        : "Titkosítva tárolódnak, a felületen később sosem jelennek meg.",
      mezok: (hitel[szolgaltato] ?? []).map((m) => ({
        name: m.name,
        label: m.label,
        type: m.password ? ("password" as const) : ("text" as const),
        titkos: true,
      })),
    },
    {
      title: "Beállítások",
      mezok: [
        {
          name: "allowInsecureTls",
          label: "Önaláírt TLS tanúsítvány engedélyezése (belső hálózat)",
          type: "checkbox",
        },
        { name: "accountId", label: "Cloudflare account ID" },
        { name: "endpointId", label: "Portainer endpoint ID", type: "number" },
      ],
    },
  ];
}
