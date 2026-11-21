import Link from "next/link";
import { cn } from "@erp/ui";
import type { BadgeTone } from "@erp/ui";

const CHIP_TONE: Record<BadgeTone, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  neutral: "bg-muted text-muted-foreground",
};

/** Metric tile: icon chip tinted by urgency, big value, label — optionally a link to the list behind it. */
export function KpiTile({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
  tone?: BadgeTone;
  href?: string;
}) {
  const body = (
    <div
      data-export-label={hint ? `${label} (${hint})` : label}
      data-export-value={String(value)}
      className={cn(
        "bg-card flex h-full items-center gap-3 rounded-xl border p-4 shadow-sm",
        href && "hover:bg-muted/40 transition-colors",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          CHIP_TONE[tone],
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-bold tabular-nums leading-7">{value}</div>
        <div className="text-muted-foreground truncate text-xs font-medium">{label}</div>
        {hint && <div className="text-muted-foreground truncate text-[11px]">{hint}</div>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/** Urgency helper: `0` is fine (green), anything above is `bad`. */
export const toneFor = (n: number, bad: BadgeTone = "danger"): BadgeTone =>
  n > 0 ? bad : "success";
