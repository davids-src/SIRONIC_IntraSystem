import type { ActivityRef } from "@erp/core";
import type { BadgeTone, DataTableQuery } from "@erp/ui";
import { partnerApi } from "@erp/partner";
import { arlistaApi } from "@erp/arlista";
import { keszletApi } from "@erp/keszlet";
import { ertekesitesApi } from "@erp/ertekesites";
import { szervizApi } from "@erp/szerviz";
import { bizonylatApi } from "@erp/bizonylat";
import { projektApi } from "@erp/projekt";
import { eszkozApi } from "@erp/eszkoz";
import { infraApi } from "@erp/infra";

/**
 * Dashboard contributions of the domain modules (docs/02 §5). The app asks every provider the
 * viewer may see for KPI tiles, recent activity and quick actions — modules never import the
 * dashboard and the dashboard never imports a model. Add a provider per module here.
 */
export type DashboardTile = {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: BadgeTone;
  /** Lucide icon name is resolved in the page; keep this serialisable. */
  icon:
    | "alert"
    | "package"
    | "file"
    | "users"
    | "wrench"
    | "check"
    | "folder"
    | "receipt"
    | "server"
    | "briefcase";
};

export type DashboardQuickAction = { label: string; href: string };

export type DashboardContribution = {
  tiles?: DashboardTile[];
  activity?: ActivityRef[];
  quickActions?: DashboardQuickAction[];
};

export type DashboardProvider = {
  /** Visible only with this key (or any of them). */
  permission: string | string[];
  load(viewer: { userId: string; permissions: string[] }): Promise<DashboardContribution>;
};

type Viewer = { userId: string; permissions: string[] };

const lap = (filters: Record<string, string> = {}) =>
  ({ page: 1, pageSize: 1, filters }) as unknown as DataTableQuery;
const tone = (n: number, ha: BadgeTone): BadgeTone | undefined =>
  n > 0 ? ha : undefined;
const jog = (v: Viewer, kulcs: string) => v.permissions.includes(kulcs);

/** One provider per module, each gated on the read key of what it shows (docs/02 §5). */
export const DASHBOARD_PROVIDERS: DashboardProvider[] = [
  {
    permission: "partner:partner:read",
    async load(v) {
      const { total } = await partnerApi.listPartnerek(lap());
      return {
        tiles: [
          { label: "Partnerek", value: total, href: "/partner", icon: "users" as const },
        ],
        quickActions: jog(v, "partner:partner:write")
          ? [{ label: "Új partner", href: "/partner/new" }]
          : [],
      };
    },
  },
  {
    permission: "arlista:termek:read",
    async load(v) {
      const { total } = await arlistaApi.listTermekek(v, lap({ aktiv: "true" }));
      return {
        tiles: [
          {
            label: "Aktív árlistatételek",
            value: total,
            href: "/arlista/termekek",
            icon: "file" as const,
          },
        ],
      };
    },
  },
  {
    permission: "keszlet:keszlet:read",
    async load(v) {
      const d = await keszletApi.getDashboard(v);
      return {
        tiles: [
          {
            label: "Minimum alatti készlet",
            value: d.alacsonyDb,
            hint: "A beállított minimum szintet elérő tételek",
            href: "/keszlet/lista",
            tone: tone(d.alacsonyDb, "warning"),
            icon: "package" as const,
          },
          ...(jog(v, "keszlet:rma:read")
            ? [
                {
                  label: "Nyitott RMA-ügyek",
                  value: d.aktivRma,
                  href: "/keszlet/rma",
                  tone: tone(d.aktivRma, "warning"),
                  icon: "wrench" as const,
                },
              ]
            : []),
        ],
        quickActions: jog(v, "keszlet:bevetel:write")
          ? [{ label: "Bevételezés", href: "/keszlet/bevetel" }]
          : [],
      };
    },
  },
  {
    permission: "ertekesites:ajanlat:read",
    async load(v) {
      const [kuldve, tevekenyseg] = await Promise.all([
        ertekesitesApi.listAjanlatok(lap({ allapot: "elkuldve" })),
        ertekesitesApi.getTevekenyseg(5),
      ]);
      return {
        tiles: [
          {
            label: "Elküldött, válaszra váró ajánlatok",
            value: kuldve.total,
            href: "/ertekesites/ajanlatok",
            icon: "briefcase" as const,
          },
        ],
        activity: tevekenyseg,
        quickActions: jog(v, "ertekesites:ajanlat:write")
          ? [{ label: "Új ajánlat", href: "/ertekesites/ajanlatok/new" }]
          : [],
      };
    },
  },
  {
    permission: "szerviz:hibajegy:read",
    async load(v) {
      const [a, tevekenyseg] = await Promise.all([
        szervizApi.getAttekintes(),
        szervizApi.getTevekenyseg(5),
      ]);
      return {
        tiles: [
          {
            label: "Nyitott hibajegyek",
            value: a.hibajegy.nyitott,
            hint: a.hibajegy.kritikus > 0 ? `${a.hibajegy.kritikus} kritikus` : undefined,
            href: "/szerviz/hibajegyek",
            tone: tone(a.hibajegy.kritikus, "danger") ?? tone(a.hibajegy.uj, "warning"),
            icon: "wrench" as const,
          },
          ...(a.munkalap.keszletHibas > 0 && jog(v, "szerviz:munkalap:read")
            ? [
                {
                  label: "Sikertelen készletkiadású munkalapok",
                  value: a.munkalap.keszletHibas,
                  href: "/szerviz/munkalapok",
                  tone: "danger" as const,
                  icon: "alert" as const,
                },
              ]
            : []),
        ],
        activity: tevekenyseg,
        quickActions: jog(v, "szerviz:hibajegy:write")
          ? [{ label: "Új hibajegy", href: "/szerviz/hibajegyek/new" }]
          : [],
      };
    },
  },
  {
    permission: "bizonylat:szamla:read",
    async load(v) {
      const [lejart, tevekenyseg] = await Promise.all([
        bizonylatApi.listSzamlak(lap({ allapot: "lejart" })),
        bizonylatApi.getTevekenyseg(5),
      ]);
      return {
        tiles: [
          {
            label: "Lejárt számlák",
            value: lejart.total,
            href: "/bizonylat/szamlak",
            tone: tone(lejart.total, "danger"),
            icon: "receipt" as const,
          },
        ],
        activity: tevekenyseg,
        quickActions: jog(v, "bizonylat:szallitolevel:write")
          ? [{ label: "Új szállítólevél", href: "/bizonylat/szallitolevelek/new" }]
          : [],
      };
    },
  },
  {
    permission: "bizonylat:igazolas:read",
    async load(v) {
      const o = await bizonylatApi.osszesitesIgazolas({
        kind: "staff",
        userId: v.userId,
      });
      return {
        tiles: [
          {
            label: "Aláírásra váró teljesítésigazolások",
            value: o.fuggoDb,
            href: "/bizonylat/igazolasok",
            tone: tone(o.fuggoDb, "warning"),
            icon: "check" as const,
          },
        ],
      };
    },
  },
  {
    permission: "projekt:projekt:read",
    async load(v) {
      const o = await projektApi.getOsszegzes();
      return {
        tiles: [
          {
            label: "Nyitott projektek",
            value: o.nyitott,
            hint: o.keso > 0 ? `${o.keso} késésben` : undefined,
            href: "/projekt",
            tone: tone(o.keso, "danger"),
            icon: "folder" as const,
          },
        ],
        quickActions: jog(v, "projekt:projekt:write")
          ? [{ label: "Új projekt", href: "/projekt/new" }]
          : [],
      };
    },
  },
  {
    permission: "eszkoz:eszkoz:read",
    async load(v) {
      const o = await eszkozApi.getOsszegzes();
      return {
        tiles: [
          {
            label: "Kiadott eszközök",
            value: o.kiadva,
            hint: o.szervizben > 0 ? `${o.szervizben} szervizben` : undefined,
            href: "/eszkoz",
            tone: tone(o.elveszett, "danger"),
            icon: "wrench" as const,
          },
        ],
        quickActions: jog(v, "eszkoz:eszkoz:write")
          ? [{ label: "Új eszköz", href: "/eszkoz/new" }]
          : [],
      };
    },
  },
  {
    permission: "infra:stack:read",
    async load(v) {
      const o = await infraApi.getOsszegzes();
      return {
        tiles: [
          {
            label: "Stackek",
            value: o.stackek,
            hint: `${o.oldalak} oldal`,
            href: "/infra",
            icon: "server" as const,
          },
        ],
        quickActions: jog(v, "infra:oldal:write")
          ? [{ label: "Új oldal", href: "/infra/oldalak/new" }]
          : [],
      };
    },
  },
];

export async function loadDashboard(viewer: {
  userId: string;
  permissions: string[];
}): Promise<Required<DashboardContribution>> {
  const out: Required<DashboardContribution> = {
    tiles: [],
    activity: [],
    quickActions: [],
  };
  const allowed = DASHBOARD_PROVIDERS.filter((p) =>
    (Array.isArray(p.permission) ? p.permission : [p.permission]).some((k) =>
      viewer.permissions.includes(k),
    ),
  );
  const results = await Promise.all(
    allowed.map((p) =>
      p.load(viewer).catch((e) => {
        // One failing module must not blank the dashboard.
        console.error("[dashboard]", e);
        return {} as DashboardContribution;
      }),
    ),
  );
  for (const r of results) {
    out.tiles.push(...(r.tiles ?? []));
    out.activity.push(...(r.activity ?? []));
    out.quickActions.push(...(r.quickActions ?? []));
  }
  out.activity.sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  return out;
}
