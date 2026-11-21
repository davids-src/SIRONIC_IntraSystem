import type { ActivityRef } from "@erp/core";
import type { BadgeTone } from "@erp/ui";

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
  icon: "alert" | "package" | "file" | "users" | "wrench" | "check";
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

export const DASHBOARD_PROVIDERS: DashboardProvider[] = [];

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
