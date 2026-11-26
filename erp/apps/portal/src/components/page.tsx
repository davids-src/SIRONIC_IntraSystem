import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@erp/ui";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>
      {actions}
    </div>
  );
}

export function Allapot({ label, tone }: { label: string; tone?: Tone }) {
  return <Badge variant={tone ?? "neutral"}>{label}</Badge>;
}

export function Ures({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground rounded border border-dashed p-6 text-center text-sm">
      {children}
    </p>
  );
}

export type Oszlop<T> = {
  fejlec: string;
  cella: (sor: T) => ReactNode;
  jobbra?: boolean;
};

/** Plain read-only table; `href` makes the first cell a link to the detail page. */
export function Tabla<T>({
  oszlopok,
  sorok,
  kulcs,
  href,
  ures = "Nincs megjeleníthető elem.",
}: {
  oszlopok: Array<Oszlop<T>>;
  sorok: T[];
  kulcs: (sor: T) => string;
  href?: (sor: T) => string;
  ures?: string;
}) {
  if (sorok.length === 0) return <Ures>{ures}</Ures>;
  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            {oszlopok.map((o) => (
              <th
                key={o.fejlec}
                className={`px-3 py-2 font-medium ${o.jobbra ? "text-right" : ""}`}
              >
                {o.fejlec}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorok.map((s) => (
            <tr key={kulcs(s)} className="border-t">
              {oszlopok.map((o, i) => (
                <td
                  key={o.fejlec}
                  className={`px-3 py-2 ${o.jobbra ? "text-right" : ""}`}
                >
                  {i === 0 && href ? (
                    <Link
                      href={href(s)}
                      className="text-primary font-medium underline-offset-2 hover:underline"
                    >
                      {o.cella(s)}
                    </Link>
                  ) : (
                    o.cella(s)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Adat({ cimke, children }: { cimke: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs uppercase tracking-wide">{cimke}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}
