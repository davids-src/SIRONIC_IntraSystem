import { Label, cn } from "@erp/ui";
import { DetailHeader } from "../detail/detail-layout";

/**
 * Shared layout of every Gépészet create/edit page, mirroring the detail pages: a header, then
 * numbered sections (what you fill in, in order), then a sticky action bar. Required fields
 * are marked with a red asterisk in <Field>.
 */
export const SELECT_CLASS =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none";

export function FormPage({
  title,
  subtitle,
  backHref,
  backLabel,
  width = "max-w-3xl",
  children,
}: {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel: string;
  width?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto flex w-full flex-col gap-4 p-4 md:gap-5 md:p-6", width)}>
      <DetailHeader
        title={title}
        subtitle={subtitle}
        backHref={backHref}
        backLabel={backLabel}
      />
      {children}
    </div>
  );
}

export function FormSection({
  step,
  title,
  description,
  columns = 1,
  children,
}: {
  step?: number;
  title: string;
  description?: string;
  columns?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card overflow-hidden rounded-xl border shadow-sm">
      <header className="bg-muted/40 flex items-center gap-3 border-b px-5 py-3">
        {step !== undefined && (
          <span className="bg-foreground text-background flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {step}
          </span>
        )}
        <div>
          <h2 className="text-base leading-6 font-semibold">{title}</h2>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
      </header>
      <div className={cn("grid gap-4 px-5 py-4", columns === 2 && "sm:grid-cols-2")}>
        {children}
      </div>
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label} {required && <span className="text-red-600">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-muted-foreground text-xs">{hint}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

/** Sticky bottom bar so the primary action is always in reach on long forms. */
export function FormActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background/95 sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 border-t px-1 py-3 backdrop-blur">
      {children}
    </div>
  );
}
