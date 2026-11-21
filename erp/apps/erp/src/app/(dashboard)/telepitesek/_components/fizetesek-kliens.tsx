"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge, Button, DataTable } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import {
  FIZETES_ALLAPOT_LABELS,
  FIZETES_ALLAPOT_TONES,
  FIZETES_LIST_COLUMNS,
  type FizetesAllapot,
  type FizetesListItem,
} from "@erp/deployments/client";
import { elengedAction, fizetveJelolAction, idoszakokGeneralAction } from "../actions";

export function FizetesekTable({
  data,
  query,
  total,
}: {
  data: FizetesListItem[];
  query: DataTableQuery;
  total: number;
}) {
  return (
    <DataTable<FizetesListItem>
      tableId="telepitesek-fizetesek"
      data={data}
      columns={FIZETES_LIST_COLUMNS}
      query={query}
      total={total}
      basePath="/telepitesek/fizetesek"
      rowHref={(r) => `/telepitesek/${r.telepitesId}`}
    />
  );
}

const nap = (iso: string) => new Date(iso).toLocaleDateString("hu-HU");

/** Open payments (overdue first) with the mark-paid / waive buttons. */
export function NyitottFizetesek({
  sorok,
  irhat,
  elengedhet,
}: {
  sorok: FizetesListItem[];
  irhat: boolean;
  elengedhet: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const fut = (f: () => Promise<{ success: boolean; message?: string }>) =>
    start(async () => {
      const r = await f();
      if (r.success) toast.success(r.message);
      else toast.error(r.message ?? "A művelet nem sikerült.");
      router.refresh();
    });
  if (sorok.length === 0)
    return <p className="text-muted-foreground text-sm">Nincs nyitott díj.</p>;
  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {sorok.map((s) => (
        <li
          key={s._id}
          className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={FIZETES_ALLAPOT_TONES[s.allapot as FizetesAllapot]}>
              {FIZETES_ALLAPOT_LABELS[s.allapot as FizetesAllapot]}
            </Badge>
            <span className="font-medium">{s.telepitesNev}</span>
            <span className="text-muted-foreground">
              {s.domain} · {nap(s.idoszakKezdet)} – {nap(s.idoszakVeg)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{s.osszegHuf.toLocaleString("hu-HU")} Ft</span>
            {irhat && (
              <Button
                size="sm"
                disabled={pending}
                onClick={() => fut(() => fizetveJelolAction(s._id))}
              >
                Fizetettnek jelöl
              </Button>
            )}
            {elengedhet && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  const ok = window.prompt("Az elengedés oka:");
                  if (ok?.trim()) fut(() => elengedAction(s._id, ok));
                }}
              >
                Elenged
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function IdoszakGeneralGomb() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      loading={pending}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await idoszakokGeneralAction();
          toast.success(r.message);
          router.refresh();
        })
      }
    >
      Időszakok generálása
    </Button>
  );
}
