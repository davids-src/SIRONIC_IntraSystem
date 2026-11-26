import type { ReactNode } from "react";
import { Label, cn } from "@erp/ui";

/** Small presentational helpers shared by the Partner forms and detail pages (no state). */

export function FormSection({
  title,
  description,
  children,
  columns = 1,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  columns?: 1 | 2;
}) {
  return (
    <section className="bg-card flex flex-col gap-4 rounded-xl border p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
        )}
      </div>
      <div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2")}>
        {children}
      </div>
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

/** Native select styled like `Input` — the UI kit has no Select primitive. */
export function NativeSelect({
  options,
  placeholder,
  ...props
}: React.ComponentProps<"select"> & {
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <select
      className="border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
      {...props}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  chips,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  chips?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
        {chips && <div className="flex flex-wrap gap-1.5">{chips}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Facts({ items }: { items: Array<{ label: string; value?: ReactNode }> }) {
  const shown = items.filter(
    (i) => i.value !== undefined && i.value !== null && i.value !== "",
  );
  if (shown.length === 0)
    return <p className="text-muted-foreground text-sm">Nincs megadott adat.</p>;
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {shown.map((i) => (
        <div key={i.label}>
          <dt className="text-muted-foreground text-xs">{i.label}</dt>
          <dd>{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function formatCim(c?: {
  iranyitoszam?: string;
  varos?: string;
  utca?: string;
  orszag?: string;
}): string | undefined {
  if (!c) return undefined;
  const line = [[c.iranyitoszam, c.varos].filter(Boolean).join(" "), c.utca, c.orszag]
    .filter(Boolean)
    .join(", ");
  return line || undefined;
}
