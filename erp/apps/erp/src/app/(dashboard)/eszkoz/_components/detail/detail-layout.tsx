import Link from "next/link";
import {
  AlertTriangleIcon,
  CircleAlertIcon,
  InfoIcon,
  LockIcon,
  PencilIcon,
  ScrollTextIcon,
  ChevronLeftIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, ListBackLink, cn } from "@erp/ui";
import type { BadgeTone } from "@erp/ui";

/**
 * Shared building blocks of every Gépészet adatlap, so each page reads the same way:
 *  1. DetailHeader – who/what is this, its status chips, the few primary actions
 *  2. AlertList    – what needs attention right now (colour = urgency)
 *  3. SectionNav   – jump links to the blocks below
 *  4. Section      – one block; its badge says whether you can change it here
 *     (Szerkeszthető / Csak olvasható / Napló), see `SectionMode`
 *  5. Facts        – label/value rows; missing values are shown explicitly
 */

const TONE_BOX: Record<BadgeTone, string> = {
  success: "border-success-border bg-success-soft text-success-soft-foreground",
  warning: "border-warning-border bg-warning-soft text-warning-soft-foreground",
  danger: "border-danger-border bg-danger-soft text-danger-soft-foreground",
  info: "border-info-border bg-info-soft text-info-soft-foreground",
  neutral: "border-border bg-muted/60 text-foreground",
};

export function DetailHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  chips,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  backHref: string;
  backLabel: string;
  /** Status / classification badges, shown right under the title. */
  chips?: React.ReactNode;
  /** Primary actions only (edit, …). Destructive actions belong in <DangerZone>. */
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b pb-4">
      <ListBackLink
        data-export="skip"
        href={backHref}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4" />
        {backLabel}
      </ListBackLink>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="break-words text-2xl font-bold leading-tight">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
          {chips && <div className="flex flex-wrap items-center gap-1.5">{chips}</div>}
        </div>
        {actions && (
          <div data-export="skip" className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

export type DetailAlert = {
  tone: Exclude<BadgeTone, "success" | "neutral">;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
};

export function AlertList({ alerts }: { alerts: DetailAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" role="region" aria-label="Figyelmeztetések">
      {alerts.map((a) => {
        const Icon =
          a.tone === "danger"
            ? CircleAlertIcon
            : a.tone === "warning"
              ? AlertTriangleIcon
              : InfoIcon;
        return (
          <div
            key={a.title}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
              TONE_BOX[a.tone],
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{a.title}</p>
              {a.description && <p className="opacity-90">{a.description}</p>}
            </div>
            {a.href && (
              <Link
                href={a.href}
                className="shrink-0 font-medium underline underline-offset-2"
              >
                {a.hrefLabel ?? "Megnyitás"}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SectionNav({ items }: { items: Array<{ id: string; label: string }> }) {
  return (
    <nav
      data-export="skip"
      aria-label="Ugrás a szakaszokhoz"
      className="bg-background/90 sticky top-0 z-10 -mx-1 flex gap-1.5 overflow-x-auto px-1 py-2 backdrop-blur"
    >
      {items.map((i) => (
        <a
          key={i.id}
          href={`#${i.id}`}
          className="bg-muted hover:bg-accent shrink-0 rounded-full px-3 py-1 text-xs font-medium"
        >
          {i.label}
        </a>
      ))}
    </nav>
  );
}

export type SectionMode = "editable" | "readonly" | "log";

const MODE_META: Record<
  SectionMode,
  { label: string; icon: React.ReactNode; className: string; hint: string }
> = {
  editable: {
    label: "Szerkeszthető",
    icon: <PencilIcon className="size-3" />,
    className: "border-info-border bg-info-soft text-info-soft-foreground",
    hint: "Itt közvetlenül módosíthatsz.",
  },
  readonly: {
    label: "Csak olvasható",
    icon: <LockIcon className="size-3" />,
    className: "border-border bg-muted text-foreground/75",
    hint: "Csak megtekintésre.",
  },
  log: {
    label: "Napló",
    icon: <ScrollTextIcon className="size-3" />,
    className: "border-note-border bg-note-soft text-note-soft-foreground",
    hint: "Új bejegyzés hozzáadható, a régiek előzményként maradnak.",
  },
};

/** `mode` says what the viewer can do *in this block*; pass `editable` only when they actually can. */
export function Section({
  id,
  title,
  description,
  mode = "readonly",
  action,
  tone,
  className,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  mode?: SectionMode;
  /** Link/button that opens the editor for this block (e.g. "Szerkesztés"). */
  action?: React.ReactNode;
  /** Colours the left accent bar, e.g. `danger` for an expired-documents block. */
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  const meta = MODE_META[mode];
  // `tone` tints the header band of the card (not an edge accent), so a card that needs
  // attention is recognisable at a glance without decorating its border.
  const band: Record<BadgeTone, string> = {
    success: "bg-success-soft/80 dark:bg-success-soft/40",
    warning: "bg-warning-soft/80 dark:bg-warning-soft/40",
    danger: "bg-danger-soft/80 dark:bg-danger-soft/40",
    info: "bg-info-soft/80 dark:bg-info-soft/40",
    neutral: "bg-muted/40",
  };
  return (
    <Card
      id={id}
      className={cn("scroll-mt-14 gap-0 overflow-hidden py-0 shadow-sm", className)}
    >
      <CardHeader
        className={cn(
          "flex flex-col gap-1 space-y-0 border-b px-5 py-3",
          band[tone ?? "neutral"],
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            <span
              title={meta.hint}
              data-export="skip"
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                meta.className,
              )}
            >
              {meta.icon}
              {meta.label}
            </span>
          </div>
          {action && <div data-export="skip">{action}</div>}
        </div>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5 py-4">{children}</CardContent>
    </Card>
  );
}

/** Titled sub-block inside a <Section> — separates e.g. "Új bejegyzés" from "Előzmények". */
export function SubBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function Facts({
  items,
  columns = 1,
}: {
  items: Array<{ label: string; value: React.ReactNode; missing?: boolean }>;
  columns?: 1 | 2;
}) {
  return (
    <dl
      className={cn("grid gap-x-6 gap-y-2.5 text-sm", columns === 2 && "sm:grid-cols-2")}
    >
      {items.map((f) => (
        <div
          key={f.label}
          className="flex items-baseline justify-between gap-3 border-b border-dashed pb-2 last:border-b-0"
        >
          <dt className="text-muted-foreground">{f.label}</dt>
          <dd
            className={cn(
              "text-right font-medium",
              f.missing && "text-warning font-normal",
            )}
          >
            {f.value === undefined || f.value === null || f.value === "" ? (
              <span className="text-muted-foreground font-normal">—</span>
            ) : (
              f.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground bg-muted/40 rounded-md border border-dashed px-3 py-4 text-center text-sm">
      {children}
    </p>
  );
}

/** Destructive actions, kept apart from the everyday ones so they are never hit by accident. */
export function DangerZone({
  children,
  description,
}: {
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <section className="border-danger-border bg-danger-soft/40 flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <h2 className="text-danger-soft-foreground text-sm font-semibold">
          Veszélyes műveletek
        </h2>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}
