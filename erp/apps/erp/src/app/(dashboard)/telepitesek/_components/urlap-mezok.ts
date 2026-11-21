import {
  INTEGRACIO_LABELS,
  INTEGRACIO_SZOLGALTATOK,
  SZAMLAZASI_CIKLUSOK,
  SZAMLAZASI_CIKLUS_LABELS,
  type TelepitesDetail,
} from "@erp/deployments/client";
import type { MezoSzekcio } from "./mezo-form";

type Opcio = { id: string; nev: string };

export function telepitesSzekciok(o: {
  partnerek: Opcio[];
  sablonok: Opcio[];
  csomagok: Opcio[];
}): MezoSzekcio[] {
  const opciok = (l: Opcio[], ures: string) => [
    { value: "", label: ures },
    ...l.map((x) => ({ value: x.id, label: x.nev })),
  ];
  return [
    {
      title: "Alapadatok",
      mezok: [
        { name: "nev", label: "Név", required: true },
        {
          name: "domain",
          label: "Domain",
          required: true,
          hint: "pl. pelda.hu — egyedi",
        },
        {
          name: "partnerId",
          label: "Partner",
          type: "select",
          options: opciok(o.partnerek, "— nincs —"),
        },
        { name: "wwwAtiranyitas", label: "www → apex átirányítás", type: "checkbox" },
        { name: "megjegyzes", label: "Megjegyzés", type: "textarea", rows: 2 },
      ],
    },
    {
      title: "DNS és proxy",
      description: "A DNS-rekordok és az NPM proxy host célja.",
      mezok: [
        {
          name: "dnsTipus",
          label: "Rekord típusa",
          type: "select",
          options: [
            { value: "A", label: "A" },
            { value: "CNAME", label: "CNAME" },
          ],
        },
        { name: "dnsCel", label: "DNS cél (IP / host)" },
        {
          name: "dnsProxied",
          label: "Cloudflare proxy (narancs felhő)",
          type: "checkbox",
        },
        { name: "celHost", label: "Proxy célhost" },
        { name: "celPort", label: "Proxy célport", type: "number" },
        {
          name: "celSema",
          label: "Séma",
          type: "select",
          options: [
            { value: "http", label: "http" },
            { value: "https", label: "https" },
          ],
        },
      ],
    },
    {
      title: "Image és stack",
      mezok: [
        {
          name: "imageRepo",
          label: "Image repository",
          hint: "pl. ghcr.io/szervezet/app",
        },
        { name: "imageTag", label: "Image tag" },
        { name: "workflowId", label: "GitHub workflow", hint: "pl. build.yml" },
        { name: "workflowRef", label: "Workflow ref" },
        {
          name: "stackNev",
          label: "Portainer stack neve",
          hint: "kisbetű, szám, kötőjel",
        },
        {
          name: "sablonId",
          label: "Stack sablon",
          type: "select",
          options: opciok(o.sablonok, "— nincs (saját compose) —"),
        },
        {
          name: "composeYaml",
          label: "Saját compose YAML (felülírja a sablont)",
          type: "textarea",
          rows: 6,
        },
        {
          name: "env",
          label: "Környezeti változók",
          type: "textarea",
          rows: 4,
          hint: "NEV=érték soronként",
        },
        {
          name: "titkosEnv",
          label: "Titkos változók",
          type: "textarea",
          rows: 3,
          hint: "NEV=érték soronként. Mentés után az érték nem látható; szerkesztéskor 'NEV=' (üres érték) megtartja a tárolt titkot.",
        },
      ],
    },
    {
      title: "Számlázás",
      mezok: [
        {
          name: "csomagId",
          label: "Csomag",
          type: "select",
          options: opciok(o.csomagok, "— nincs —"),
        },
        {
          name: "szamlazasiCiklus",
          label: "Ciklus (üres = a csomag alapja)",
          type: "select",
          options: [
            { value: "", label: "— a csomagé —" },
            ...SZAMLAZASI_CIKLUSOK.map((c) => ({
              value: c,
              label: SZAMLAZASI_CIKLUS_LABELS[c],
            })),
          ],
        },
        { name: "arFelulirasHuf", label: "Ár felülírása (Ft)", type: "number" },
      ],
    },
  ];
}

export function telepitesErtekek(t: TelepitesDetail) {
  return {
    nev: t.nev,
    domain: t.domain,
    partnerId: t.partnerId,
    wwwAtiranyitas: t.wwwAtiranyitas,
    megjegyzes: t.megjegyzes,
    dnsTipus: t.dns.rekordTipus,
    dnsCel: t.dns.cel,
    dnsProxied: t.dns.proxied,
    celHost: t.proxy.celHost,
    celPort: t.proxy.celPort,
    celSema: t.proxy.celSema,
    imageRepo: t.image.repo,
    imageTag: t.image.tag,
    workflowId: t.image.workflowId,
    workflowRef: t.image.workflowRef,
    stackNev: t.stack.nev,
    sablonId: t.stack.sablonId,
    composeYaml: t.stack.composeYaml,
    env: t.stack.env
      .filter((e) => !e.titkos)
      .map((e) => `${e.nev}=${e.ertek ?? ""}`)
      .join("\n"),
    // Existing secrets are listed by name with an empty value: kept unless replaced.
    titkosEnv: t.stack.env
      .filter((e) => e.titkos)
      .map((e) => `${e.nev}=`)
      .join("\n"),
    csomagId: t.csomagId,
    szamlazasiCiklus: t.szamlazasiCiklus,
    arFelulirasHuf: t.arFelulirasHuf,
  };
}

export const CSOMAG_SZEKCIOK: MezoSzekcio[] = [
  {
    title: "Csomag",
    mezok: [
      {
        name: "kod",
        label: "Kód",
        required: true,
        hint: "kisbetű, szám, kötőjel (pl. small-5gb)",
      },
      { name: "nev", label: "Név", required: true },
      { name: "arHuf", label: "Ár (Ft)", type: "number", required: true },
      {
        name: "alapCiklus",
        label: "Alap ciklus",
        type: "select",
        options: SZAMLAZASI_CIKLUSOK.map((c) => ({
          value: c,
          label: SZAMLAZASI_CIKLUS_LABELS[c],
        })),
      },
      { name: "leiras", label: "Leírás", type: "textarea", rows: 2 },
      { name: "aktiv", label: "Aktív", type: "checkbox" },
      { name: "sorrend", label: "Sorrend", type: "number" },
    ],
  },
  {
    title: "Erőforrások",
    mezok: [
      { name: "vcpu", label: "vCPU", type: "number" },
      { name: "ramMb", label: "RAM (MB)", type: "number" },
      { name: "diskGb", label: "Tárhely (GB)", type: "number" },
      { name: "savszelessegGb", label: "Sávszélesség (GB)", type: "number" },
    ],
  },
];

export const SABLON_SZEKCIOK: MezoSzekcio[] = [
  {
    title: "Sablon",
    mezok: [
      { name: "nev", label: "Név", required: true },
      { name: "alapertelmezett", label: "Alapértelmezett sablon", type: "checkbox" },
      { name: "leiras", label: "Leírás", type: "textarea", rows: 2 },
      {
        name: "composeYaml",
        label: "Compose YAML",
        type: "textarea",
        rows: 14,
        required: true,
        hint: "Helyőrzők: {{ DOMAIN }}, {{ IMAGE }}, {{ IMAGE_TAG }}, {{ STACK_NAME }} és saját kulcsok.",
      },
      {
        name: "helyorzok",
        label: "Helyőrzők",
        type: "textarea",
        rows: 4,
        hint: "KULCS|Címke|kötelező (i/n)|titkos (i/n)|alapérték — soronként. A nem deklarált helyőrzők opcionálisként bekerülnek.",
      },
      {
        name: "halozatok",
        label: "Szükséges hálózatok",
        hint: "szóközzel vagy vesszővel elválasztva",
      },
    ],
  },
];

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
