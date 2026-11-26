"use client";

import Link from "next/link";
import { DataTable, type ColumnDef, type DataTableQuery } from "@erp/ui";
import {
  STACK_ALLAPOTOK,
  STACK_ALLAPOT_LABELS,
  STACK_ALLAPOT_TONES,
  STACK_TIPUSOK,
  STACK_TIPUS_LABELS,
  WEBHELY_TIPUSOK,
  WEBHELY_TIPUS_LABELS,
} from "@erp/infra/client";
import {
  KonteinerFrissit,
  KonteinerInditLeallit,
  KonteinerUjraindit,
  OldalPartner,
} from "./muveletek";
import { imageRovid } from "./megjelenites";

const alap: DataTableQuery = { page: 1, pageSize: 50 };

// ── Stackek ─────────────────────────────────────────────────────────────────────

export type StackTablaSor = {
  id: string;
  nev: string;
  tipus: string;
  allapot: string;
  konteynerek: string;
  imagek: string;
  oldalSzam: number;
  partner: string;
};

const STACK_OSZLOPOK: Array<ColumnDef<StackTablaSor>> = [
  { key: "nev", label: "Stack", type: "string", sortable: true, searchable: true },
  {
    key: "allapot",
    label: "Állapot",
    type: "enum",
    enumValues: STACK_ALLAPOTOK.map((v) => ({
      value: v,
      label: STACK_ALLAPOT_LABELS[v],
    })),
    badgeTones: STACK_ALLAPOT_TONES,
    filterable: true,
    sortable: true,
  },
  {
    key: "tipus",
    label: "Típus",
    type: "enum",
    enumValues: STACK_TIPUSOK.map((v) => ({ value: v, label: STACK_TIPUS_LABELS[v] })),
    filterable: true,
    sortable: true,
  },
  {
    key: "konteynerek",
    label: "Konténerek",
    type: "string",
    headerHint: "futó / összes",
  },
  { key: "imagek", label: "Image-ek", type: "string", searchable: true },
  { key: "oldalSzam", label: "Oldalak", type: "number", sortable: true, align: "right" },
  {
    key: "partner",
    label: "Partner",
    type: "string",
    sortable: true,
    filterable: true,
    filterVariant: "select",
    searchable: true,
  },
];

export function StackokTabla({ rows }: { rows: StackTablaSor[] }) {
  return (
    <DataTable<StackTablaSor>
      mode="client"
      tableId="infra-stackek"
      data={rows}
      columns={STACK_OSZLOPOK}
      query={alap}
      total={rows.length}
      basePath="/infra/stackek"
      rowHref={(r) => `/infra/stackek/${r.id}`}
      emptyMessage="Nincs stack. Futtass szinkront az Áttekintés oldalon, vagy hozz létre egy újat."
    />
  );
}

// ── Oldalak ─────────────────────────────────────────────────────────────────────

export type OldalTablaSor = {
  id: string;
  hostnev: string;
  aliasok: string;
  stack: string;
  cel: string;
  partner: string;
};

const OLDAL_OSZLOPOK: Array<ColumnDef<OldalTablaSor>> = [
  { key: "hostnev", label: "Hostnév", type: "string", sortable: true, searchable: true },
  {
    key: "aliasok",
    label: "Aliasok",
    type: "string",
    searchable: true,
    defaultVisible: false,
  },
  {
    key: "stack",
    label: "Stack",
    type: "string",
    sortable: true,
    filterable: true,
    filterVariant: "select",
    searchable: true,
  },
  { key: "cel", label: "Cél (szolgáltatás:port)", type: "string", searchable: true },
  {
    key: "partner",
    label: "Partner",
    type: "string",
    sortable: true,
    filterable: true,
    filterVariant: "select",
    searchable: true,
  },
];

export function OldalakTabla({ rows }: { rows: OldalTablaSor[] }) {
  return (
    <DataTable<OldalTablaSor>
      mode="client"
      tableId="infra-oldalak"
      data={rows}
      columns={OLDAL_OSZLOPOK}
      query={alap}
      total={rows.length}
      basePath="/infra/oldalak"
      rowHref={(r) => `/infra/oldalak/${r.id}`}
      emptyMessage="Nincs oldal. Futtass szinkront, vagy vegyél fel újat."
    />
  );
}

// ── Egy stack konténerei ────────────────────────────────────────────────────────

export type KonteinerTablaSor = {
  id: string;
  nev: string;
  szolgaltatas: string;
  image: string;
  allapot: string;
  statusz: string;
  portok: string;
};

export function KonteinerekTabla({
  stackId,
  rows,
  muvelhet,
}: {
  stackId: string;
  rows: KonteinerTablaSor[];
  muvelhet: boolean;
}) {
  const oszlopok: Array<ColumnDef<KonteinerTablaSor>> = [
    {
      key: "nev",
      label: "Konténer",
      type: "string",
      sortable: true,
      render: (_v, r) => (
        <span>
          <span className="font-medium">{r.nev}</span>
          {r.szolgaltatas && r.szolgaltatas !== r.nev && (
            <span className="text-muted-foreground block text-xs">
              service: {r.szolgaltatas}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "image",
      label: "Image",
      type: "string",
      render: (_v, r) => (
        <span className="block max-w-[18rem] truncate font-mono text-xs" title={r.image}>
          {imageRovid(r.image)}
        </span>
      ),
    },
    {
      key: "allapot",
      label: "Állapot",
      type: "enum",
      enumValues: [
        { value: "running", label: "Fut" },
        { value: "exited", label: "Leállt" },
        { value: "restarting", label: "Újraindul" },
        { value: "paused", label: "Szüneteltetve" },
        { value: "created", label: "Létrehozva" },
        { value: "dead", label: "Hibás" },
      ],
      badgeTones: {
        running: "success",
        exited: "neutral",
        restarting: "danger",
        paused: "warning",
        created: "info",
        dead: "danger",
      },
      filterable: true,
    },
    { key: "statusz", label: "Részletek", type: "string", defaultVisible: false },
    { key: "portok", label: "Portok", type: "string" },
    ...(muvelhet
      ? [
          {
            key: "muveletek",
            label: "Műveletek",
            exportable: false,
            hideable: false,
            render: (_v: unknown, r: KonteinerTablaSor) => (
              <span
                className="flex flex-wrap gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <KonteinerFrissit id={stackId} konteiner={r.nev} />
                <KonteinerInditLeallit
                  id={stackId}
                  konteiner={r.nev}
                  fut={r.allapot === "running" || r.allapot === "restarting"}
                />
                <KonteinerUjraindit id={stackId} konteiner={r.nev} />
              </span>
            ),
          } satisfies ColumnDef<KonteinerTablaSor>,
        ]
      : []),
  ];
  return (
    <DataTable<KonteinerTablaSor>
      mode="client"
      tableId="infra-konteinerek"
      data={rows}
      columns={oszlopok}
      query={{ page: 1, pageSize: 50 }}
      total={rows.length}
      basePath={`/infra/stackek/${stackId}`}
      exportable={false}
      emptyMessage="Nincs konténer."
    />
  );
}

// ── Egy stack oldalai (partner oldalanként) ─────────────────────────────────────

export type StackOldalSor = {
  id: string;
  hostnevek: string;
  cel: string;
  partnerId: string;
};

export function StackOldalakTabla({
  rows,
  partnerek,
  irhat,
  stackPartner,
}: {
  rows: StackOldalSor[];
  partnerek: Array<{ id: string; nev: string }>;
  irhat: boolean;
  stackPartner?: string;
}) {
  const oszlopok: Array<ColumnDef<StackOldalSor>> = [
    {
      key: "hostnevek",
      label: "Hostnév",
      type: "string",
      sortable: true,
      render: (_v, r) => (
        <Link
          href={`/infra/oldalak/${r.id}`}
          className="font-medium underline-offset-2 hover:underline"
        >
          {r.hostnevek}
        </Link>
      ),
    },
    { key: "cel", label: "Cél", type: "string" },
    {
      key: "partnerId",
      label: "Partner",
      type: "string",
      headerHint:
        "Oldalanként állítható: lehet belső (nincs partner) vagy bármelyik partneré.",
      render: (_v, r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <OldalPartner
            id={r.id}
            partnerId={r.partnerId}
            partnerek={partnerek}
            irhat={irhat}
            stackPartner={stackPartner}
          />
        </span>
      ),
      exportValue: (r) => partnerek.find((p) => p.id === r.partnerId)?.nev ?? "",
    },
  ];
  return (
    <DataTable<StackOldalSor>
      mode="client"
      tableId="infra-stack-oldalak"
      data={rows}
      columns={oszlopok}
      query={{ page: 1, pageSize: 50 }}
      total={rows.length}
      basePath="/infra/stackek"
      exportable={false}
      emptyMessage="Ehhez a stackhez még nincs oldal."
    />
  );
}

// ── Sablonok ────────────────────────────────────────────────────────────────────────────────

export type SablonTablaSor = {
  id: string;
  nev: string;
  leiras: string;
  tipus: string;
  szolgaltatasok: number;
};

const SABLON_OSZLOPOK: Array<ColumnDef<SablonTablaSor>> = [
  { key: "nev", label: "Sablon", type: "string", sortable: true, searchable: true },
  { key: "leiras", label: "Leírás", type: "string", searchable: true },
  {
    key: "tipus",
    label: "Típus",
    type: "enum",
    enumValues: STACK_TIPUSOK.map((v) => ({ value: v, label: STACK_TIPUS_LABELS[v] })),
    filterable: true,
    sortable: true,
  },
  {
    key: "szolgaltatasok",
    label: "Szolgáltatások",
    type: "number",
    align: "right",
    sortable: true,
  },
];

export function SablonokTabla({ rows }: { rows: SablonTablaSor[] }) {
  return (
    <DataTable<SablonTablaSor>
      mode="client"
      tableId="infra-sablonok"
      data={rows}
      columns={SABLON_OSZLOPOK}
      query={alap}
      total={rows.length}
      basePath="/infra/sablonok"
      rowHref={(r) => `/infra/sablonok/${r.id}`}
      emptyMessage="Még nincs sablon. Hozz létre egyet, vagy mentsd el egy meglévő stack compose-át sablonnak."
    />
  );
}

// ── Webhelyek ───────────────────────────────────────────────────────────────────────────────

export type WebhelyTablaSor = {
  id: string;
  nev: string;
  tipus: string;
  hostnev: string;
  partner: string;
  tarhely: string;
  lejarat: string;
  allapot: string;
  hozzaferesek: number;
};

const WEBHELY_OSZLOPOK: Array<ColumnDef<WebhelyTablaSor>> = [
  { key: "nev", label: "Webhely", type: "string", sortable: true, searchable: true },
  {
    key: "tipus",
    label: "Típus",
    type: "enum",
    enumValues: WEBHELY_TIPUSOK.map((v) => ({
      value: v,
      label: WEBHELY_TIPUS_LABELS[v],
    })),
    filterable: true,
    sortable: true,
  },
  { key: "hostnev", label: "Hostnév", type: "string", sortable: true, searchable: true },
  {
    key: "partner",
    label: "Partner",
    type: "string",
    sortable: true,
    filterable: true,
    filterVariant: "select",
    searchable: true,
  },
  {
    key: "tarhely",
    label: "Tárhely",
    type: "string",
    searchable: true,
    filterable: true,
    filterVariant: "select",
  },
  { key: "lejarat", label: "Lejárat", type: "string", sortable: true },
  {
    key: "allapot",
    label: "Állapot",
    type: "enum",
    enumValues: [
      { value: "ok", label: "Elérhető" },
      { value: "hiba", label: "Hiba" },
      { value: "nincs", label: "Nem ellenőrzött" },
    ],
    badgeTones: { ok: "success", hiba: "danger", nincs: "neutral" },
    filterable: true,
  },
  {
    key: "hozzaferesek",
    label: "Belépések",
    type: "number",
    align: "right",
    sortable: true,
  },
];

export function WebhelyekTabla({ rows }: { rows: WebhelyTablaSor[] }) {
  return (
    <DataTable<WebhelyTablaSor>
      mode="client"
      tableId="infra-webhelyek"
      data={rows}
      columns={WEBHELY_OSZLOPOK}
      query={alap}
      total={rows.length}
      basePath="/infra/webhelyek"
      rowHref={(r) => `/infra/webhelyek/${r.id}`}
      emptyMessage="Még nincs webhely. Vedd fel a WordPress és FTP-s oldalakat, hogy egy helyen legyenek a belépéseikkel."
    />
  );
}
