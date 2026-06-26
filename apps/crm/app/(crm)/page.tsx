"use client";

import * as React from "react";
import { Button } from "@crm/ui";
import { hasPermission } from "@crm/rbac";
import { toActorContext } from "@crm/auth";
import type { RoleKey } from "@crm/types";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Ticket,
  FolderKanban,
  FileText,
  BadgeCheck,
  FileSignature,
  ClipboardList,
  Plus,
  Clock,
  AlertCircle,
  ShieldAlert,
  ReceiptText,
  Wrench,
  ArrowRight,
  TrendingUp,
  Users,
  Tag,
  FilePen,
  CalendarCheck,
  ShoppingCart,
} from "lucide-react";
import { apiJson, ApiError } from "@/lib/api-client";

type ActivityKind = "ticket" | "worklog" | "contract" | "certificate";

type DashboardPayload = {
  stats: {
    openTickets: number;
    activeProjects: number;
    invoicesAwaiting: number;
    pendingSignatures: number;
    openWorklogs: number;
    overdueInvoices: number;
    warrantiesExpiringSoon: number;
  };
  recentActivity: {
    id: string;
    kind: ActivityKind;
    description: string;
    timeLabel: string;
    at: string;
  }[];
  upcomingDeadlines: {
    id: string;
    kind: "project" | "contract";
    name: string;
    type: string;
    contact: string;
    date: string;
    badge: string;
    urgent: boolean;
  }[];
  pendingSignatures: {
    id: string;
    kind: "contract" | "certificate";
    number: string;
    name: string;
    contact: string;
    href: string;
  }[];
  weeklyActivity: { day: string; count: number }[];
};

function activityIcon(kind: ActivityKind) {
  const map: Record<ActivityKind, React.ReactNode> = {
    ticket: <Ticket size={15} />,
    worklog: <ClipboardList size={15} />,
    contract: <FileSignature size={15} />,
    certificate: <BadgeCheck size={15} />,
  };
  return (
    <div className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-primary/10 text-primary">
      {map[kind] ?? <Clock size={15} />}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  colorClass,
  bgClass,
  alert,
  href,
  router,
}: {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  alert?: boolean;
  href?: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 flex items-center gap-4 transition-all ${href ? "cursor-pointer hover:border-primary/40 hover:shadow-sm" : ""}`}
      onClick={() => href && router.push(href)}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${bgClass} ${colorClass}`}
      >
        {icon}
      </div>
      <div className="flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-end gap-1.5">
          <span className="text-2xl font-bold text-foreground leading-none">
            {value ?? "—"}
          </span>
          {alert && value !== undefined && value > 0 && (
            <span className="mb-0.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
          )}
        </div>
        <span className="text-xs text-muted-foreground truncate block mt-0.5">
          {label}
        </span>
      </div>
      {href && (
        <ArrowRight size={14} className="flex-shrink-0 text-muted-foreground/40" />
      )}
    </div>
  );
}

/** Mini heti heatmap bar */
function WeeklyHeatmap({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-12">
      {data.map(({ day, count }) => {
        const pct = count / max;
        const heightClass =
          pct === 0
            ? "h-1"
            : pct < 0.25
              ? "h-3"
              : pct < 0.5
                ? "h-5"
                : pct < 0.75
                  ? "h-8"
                  : "h-12";
        return (
          <div
            key={day}
            className="flex flex-col items-center gap-1 flex-1"
            title={`${day}: ${count} esemény`}
          >
            <div
              className={`w-full rounded-sm transition-all ${heightClass} ${count === 0 ? "bg-muted" : "bg-primary/70"}`}
            />
            <span className="text-[9px] text-muted-foreground/60 font-medium">{day}</span>
          </div>
        );
      })}
    </div>
  );
}

const quickLinks = [
  { label: "Új munkalap", icon: <FilePen size={15} />, href: "/worklogs/new?quick=1" },
  { label: "Új ticket", icon: <Ticket size={15} />, href: "/tickets/new" },
  { label: "Kontaktok", icon: <Users size={15} />, href: "/contacts" },
  { label: "Ajánlatok", icon: <ReceiptText size={15} />, href: "/offers" },
  { label: "Projektek", icon: <FolderKanban size={15} />, href: "/projects" },
  { label: "Árlista", icon: <Tag size={15} />, href: "/service-price-list" },
  { label: "Rendelések", icon: <ShoppingCart size={15} />, href: "/purchase-orders" },
  { label: "Karbantartás", icon: <CalendarCheck size={15} />, href: "/maintenance" },
];

export default function CrmDashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUser = session?.user as Session["user"] | undefined;
  const [data, setData] = React.useState<DashboardPayload | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const actor =
    sessionUser?.id && sessionUser.tenantId && sessionUser.roleKeys
      ? toActorContext({
          userId: sessionUser.id,
          tenantId: sessionUser.tenantId,
          roleKeys: sessionUser.roleKeys as RoleKey[],
        })
      : null;

  const canViewOrganizations = actor
    ? hasPermission(actor, { module: "contact", action: "view", scope: "global" })
    : false;

  React.useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const json = await apiJson<DashboardPayload>("/api/dashboard", {
          signal: ac.signal,
        });
        setData(json);
        setLoadError(null);
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) {
          setLoadError("Nincs jogosultságod a vezérlőpulthoz.");
        } else if (e instanceof Error && e.name === "AbortError") {
          return;
        } else {
          setLoadError("A vezérlőpult adatai nem tölthetők be.");
        }
      }
    })();
    return () => ac.abort();
  }, []);

  const stats = data?.stats;

  const primaryStats = [
    {
      label: "Nyitott ticketek",
      value: stats?.openTickets,
      icon: <Ticket size={20} />,
      colorClass: "text-blue-400",
      bgClass: "bg-blue-500/10",
      href: "/tickets",
    },
    {
      label: "Aktív projektek",
      value: stats?.activeProjects,
      icon: <FolderKanban size={20} />,
      colorClass: "text-violet-400",
      bgClass: "bg-violet-500/10",
      href: "/projects",
    },
    {
      label: "Nyitott munkalapok",
      value: stats?.openWorklogs,
      icon: <ClipboardList size={20} />,
      colorClass: "text-cyan-400",
      bgClass: "bg-cyan-500/10",
      href: "/worklogs",
    },
    {
      label: "Aláírásra vár",
      value: stats?.pendingSignatures,
      icon: <BadgeCheck size={20} />,
      colorClass: "text-primary",
      bgClass: "bg-primary/10",
      href: "/contracts",
    },
  ];

  const alertStats = [
    {
      label: "Lejárt számlák",
      value: stats?.overdueInvoices,
      icon: <AlertCircle size={18} />,
      colorClass: "text-destructive",
      bgClass: "bg-destructive/10",
      alert: true,
      href: "/invoices",
    },
    {
      label: "Fizetésre vár (számla)",
      value: stats?.invoicesAwaiting,
      icon: <ReceiptText size={18} />,
      colorClass: "text-amber-400",
      bgClass: "bg-amber-500/10",
      href: "/invoices",
    },
    {
      label: "Lejáró garancia (30n)",
      value: stats?.warrantiesExpiringSoon,
      icon: <ShieldAlert size={18} />,
      colorClass: "text-orange-400",
      bgClass: "bg-orange-500/10",
      alert: true,
      href: "/warranties",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Fejléc ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Vezérlőpult</h1>
          <p className="text-sm text-muted-foreground">
            {sessionUser?.name ?? "Rendszergazda"} ·{" "}
            {canViewOrganizations ? "Teljes hozzáférés" : "Korlátozott hozzáférés"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="secondary" onClick={() => router.push("/tickets/new")}>
            <Ticket size={15} className="mr-1.5" />
            Ticket
          </Button>
          <Button variant="primary" onClick={() => router.push("/worklogs/new?quick=1")}>
            <Plus size={15} className="mr-1.5" />
            Munkalap
          </Button>
        </div>
      </div>

      {loadError && (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      )}

      {/* ── Elsődleges statisztikák (4 kártya) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryStats.map((s) => (
          <StatCard key={s.label} {...s} router={router} />
        ))}
        {!data && !loadError && (
          <p className="text-sm text-muted-foreground col-span-full">Betöltés…</p>
        )}
      </div>

      {/* ── Figyelmeztetős statisztikák + Heti aktivitás ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {alertStats.map((s) => (
          <StatCard key={s.label} {...s} router={router} />
        ))}

        {/* Heti aktivitás heatmap */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Heti aktivitás
            </span>
          </div>
          {data?.weeklyActivity ? (
            <WeeklyHeatmap data={data.weeklyActivity} />
          ) : (
            <div className="h-12 animate-pulse rounded bg-muted" />
          )}
          <p className="text-[10px] text-muted-foreground/50">
            Ticket + munkalap módosítások (7 nap)
          </p>
        </div>
      </div>

      {/* ── Gyors navigáció ── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Gyors navigáció
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {quickLinks.map((l) => (
            <button
              key={l.href}
              type="button"
              onClick={() => router.push(l.href)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-muted transition-colors text-center"
            >
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                {l.icon}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground leading-tight">
                {l.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Fő tartalmi rács (3 hasáb) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Legutóbbi aktivitás */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Legutóbbi aktivitás
            </h2>
            <span className="text-[10px] text-muted-foreground/60">Frissítve: most</span>
          </div>
          <div className="flex flex-col divide-y divide-border/50">
            {(data?.recentActivity ?? []).length === 0 && data && (
              <p className="text-sm py-4 text-muted-foreground">
                Még nincs megjeleníthető aktivitás.
              </p>
            )}
            {!data && !loadError && (
              <div className="flex flex-col gap-3 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-9 rounded-md animate-pulse bg-muted" />
                ))}
              </div>
            )}
            {(data?.recentActivity ?? []).map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2.5">
                {activityIcon(item.kind)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.description}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
                  <Clock size={11} />
                  {item.timeLabel}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Jobb oszlop: Határidők + Aláírások */}
        <div className="flex flex-col gap-6">
          {/* Közelgő határidők */}
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
            <div className="pb-2 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Közelgő határidők
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {(data?.upcomingDeadlines ?? []).length === 0 && data && (
                <p className="text-sm text-muted-foreground">
                  Nincs közelgő határidő a következő 60 napban.
                </p>
              )}
              {!data && !loadError && (
                <div className="flex flex-col gap-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-14 rounded-lg animate-pulse bg-muted" />
                  ))}
                </div>
              )}
              {(data?.upcomingDeadlines ?? []).map((dl) => (
                <button
                  type="button"
                  key={`${dl.kind}-${dl.id}`}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg text-left w-full bg-muted/40 hover:bg-muted/70 transition-colors"
                  onClick={() =>
                    router.push(
                      dl.kind === "project"
                        ? `/projects/${dl.id}`
                        : `/contracts/${dl.id}`,
                    )
                  }
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {dl.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {dl.type} · {dl.contact}
                    </span>
                    <span className="text-xs text-muted-foreground">{dl.date}</span>
                  </div>
                  <span
                    className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                      dl.urgent
                        ? "bg-destructive/15 text-destructive"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {dl.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Aláírásra vár */}
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
            <div className="pb-2 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Aláírásra vár
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {(data?.pendingSignatures ?? []).length === 0 && data && (
                <p className="text-sm text-muted-foreground">
                  Nincs függőben lévő aláírás.
                </p>
              )}
              {!data && !loadError && (
                <div className="flex flex-col gap-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-12 rounded-lg animate-pulse bg-muted" />
                  ))}
                </div>
              )}
              {(data?.pendingSignatures ?? []).map((sig) => (
                <div
                  key={`${sig.kind}-${sig.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer bg-muted/40 hover:bg-muted/70 transition-colors"
                  onClick={() => router.push(sig.href)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(sig.href);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded flex-shrink-0 bg-primary/10 text-primary flex items-center justify-center">
                      {sig.kind === "contract" ? (
                        <FileSignature size={12} />
                      ) : (
                        <BadgeCheck size={12} />
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {sig.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {sig.contact} · {sig.number}
                      </span>
                    </div>
                  </div>
                  <AlertCircle size={14} className="text-blue-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
