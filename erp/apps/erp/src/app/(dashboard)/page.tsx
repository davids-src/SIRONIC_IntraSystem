import Link from "next/link";
import {
  AlertTriangleIcon,
  BriefcaseIcon,
  CheckCircle2Icon,
  FileClockIcon,
  FolderIcon,
  PackageIcon,
  PlusIcon,
  ReceiptIcon,
  ServerIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import { requireAuth } from "@erp/auth";
import { connectDB, User } from "@erp/db-core";
import { Container, Badge, Button } from "@erp/ui";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { getSajatTaskRefs, csakTeendok } from "@/lib/teendo-feed";
import { KpiTile } from "@/components/kpi-tile";
import { Panel } from "@/components/panel";
import { loadDashboard, type DashboardTile } from "@/lib/dashboard";

const MODULE_LABELS: Record<string, string> = {
  feladat: "Feladatok",
  ertekesites: "Értékesítés",
  szerviz: "Szerviz",
  bizonylat: "Bizonylat",
  projekt: "Projekt",
  keszlet: "Készlet",
  partner: "Partner",
  eszkoz: "Eszköz",
  deployments: "Telepítések",
};

const ICONS: Record<DashboardTile["icon"], React.ReactNode> = {
  alert: <AlertTriangleIcon className="size-4" />,
  package: <PackageIcon className="size-4" />,
  file: <FileClockIcon className="size-4" />,
  users: <UsersIcon className="size-4" />,
  wrench: <WrenchIcon className="size-4" />,
  check: <CheckCircle2Icon className="size-4" />,
  folder: <FolderIcon className="size-4" />,
  receipt: <ReceiptIcon className="size-4" />,
  server: <ServerIcon className="size-4" />,
  briefcase: <BriefcaseIcon className="size-4" />,
};

const dateTime = new Intl.DateTimeFormat("hu-HU", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Relative, human time ("3 órája", "tegnap") with the exact value left to the tooltip. */
function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "most";
  if (min < 60) return `${min} perce`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} órája`;
  const d = Math.round(h / 24);
  return d === 1 ? "tegnap" : `${d} napja`;
}

export default async function DashboardPage() {
  const user = await requireAuth();
  const canUsers = user.permissions.includes("users:read");

  const [refs, dash, userCounts] = await Promise.all([
    getSajatTaskRefs(user.id),
    loadDashboard({ userId: user.id, permissions: user.permissions }),
    canUsers
      ? connectDB().then(async () => ({
          active: await User.countDocuments({ isActive: true }).exec(),
          inactive: await User.countDocuments({ isActive: false }).exec(),
        }))
      : null,
  ]);
  const tasks = csakTeendok(refs);
  const { activity, quickActions } = dash;
  const tiles = dash.tiles.map((t) => ({ ...t, icon: ICONS[t.icon] }));
  const urgent = tiles.filter((t) => t.tone === "danger" || t.tone === "warning").length;

  await connectDB();
  const actorIds = [...new Set(activity.map((a) => a.changedBy))];
  const actorRows = actorIds.length
    ? await User.find({ _id: { $in: actorIds } })
        .select("name")
        .lean()
        .exec()
    : [];
  const actorName = new Map(actorRows.map((u) => [String(u._id), u.name as string]));

  const firstName = user.name?.split(" ")[0];

  return (
    <Container className="flex max-w-6xl flex-col gap-4 pb-20 md:gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            Üdv újra{firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="text-muted-foreground text-sm">
            Vezérlőpult ·{" "}
            {new Intl.DateTimeFormat("hu-HU", { dateStyle: "full" }).format(new Date())}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/help">Felhasználói útmutató</Link>
        </Button>
      </div>

      <PwaInstallPrompt />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Panel
            title="Figyelmet igényel"
            description={
              tiles.length === 0
                ? undefined
                : urgent > 0
                  ? `${urgent} terület kér figyelmet — a csempére kattintva a részletes lista nyílik.`
                  : "Minden mutató rendben van."
            }
          >
            {tiles.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Jelenleg egyik modulhoz sincs megtekintési jogosultságod, így nincs
                megjeleníthető mutató. A hozzáférést a rendszergazda állíthatja be.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {tiles.map((t) => (
                  <KpiTile key={t.label} {...t} />
                ))}
              </div>
            )}
          </Panel>

          {activity.length > 0 && (
            <Panel
              title="Legutóbbi tevékenység"
              description="Állapotváltozások a hozzáférhető modulokban, időrendben."
            >
              {activity.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Még nincs rögzített tevékenység.
                </p>
              ) : (
                <ul className="flex flex-col divide-y">
                  {activity.map((a) => (
                    <li
                      key={`${a.entityType}-${a.entityId}-${a.changedAt}`}
                      className="flex items-start justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <Link
                          href={a.url}
                          className="block truncate text-sm font-medium hover:underline"
                        >
                          {a.title}
                        </Link>
                        <p className="text-muted-foreground truncate text-xs">
                          {MODULE_LABELS[a.module] ?? a.module} ·{" "}
                          {actorName.get(a.changedBy) ?? "ismeretlen felhasználó"}
                          {a.note ? ` · „${a.note}”` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant="outline">{a.statusLabel}</Badge>
                        <time
                          dateTime={a.changedAt}
                          title={dateTime.format(new Date(a.changedAt))}
                          className="text-muted-foreground text-[11px]"
                        >
                          {ago(a.changedAt)}
                        </time>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Panel
            title="Teendőim"
            description="Rád váró tételek, határidő szerint."
            href="/feladatok"
          >
            {tasks.length === 0 ? (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <CheckCircle2Icon className="text-success size-4" />
                Nincs hozzád rendelt feladat.
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {tasks.slice(0, 6).map((t) => (
                  <li key={`${t.module}-${t.entityId}`} className="py-2">
                    <Link
                      href={t.url}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {t.title}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {MODULE_LABELS[t.module] ?? t.module} · {t.status}
                    </p>
                  </li>
                ))}
                {tasks.length > 6 && (
                  <li className="text-muted-foreground pt-2 text-xs">
                    … és még {tasks.length - 6} további
                  </li>
                )}
              </ul>
            )}
          </Panel>

          {quickActions.length > 0 && (
            <Panel title="Gyors műveletek">
              <div className="flex flex-col gap-2">
                {quickActions.map((a) => (
                  <Button
                    key={a.href}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    asChild
                  >
                    <Link href={a.href}>
                      <PlusIcon className="mr-2 size-4" />
                      {a.label}
                    </Link>
                  </Button>
                ))}
              </div>
            </Panel>
          )}

          {userCounts && (
            <Panel title="Rendszer" href="/admin/users" hrefLabel="Felhasználók">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-2xl font-bold tabular-nums">
                    {userCounts.active}
                  </div>
                  <div className="text-muted-foreground text-xs">aktív felhasználó</div>
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums">
                    {userCounts.inactive}
                  </div>
                  <div className="text-muted-foreground text-xs">inaktív</div>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </Container>
  );
}
