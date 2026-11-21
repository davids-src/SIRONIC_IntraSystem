import Link from "next/link";
import { cn } from "@erp/ui";

/** Titled dashboard panel with an optional "see all" link. */
export function Panel({
  title,
  description,
  href,
  hrefLabel = "Összes",
  className,
  children,
}: {
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("bg-card overflow-hidden rounded-xl border shadow-sm", className)}
    >
      <header className="bg-muted/40 flex items-center justify-between gap-2 border-b px-5 py-3">
        <div>
          <h2 className="text-base leading-6 font-semibold">{title}</h2>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
          >
            {hrefLabel}
          </Link>
        )}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
