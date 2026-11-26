import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { Badge, cn } from "@erp/ui";
import { NAP } from "@/lib/teendo";
import { FolyamatHaladasSor, FolyamatUt } from "@/components/folyamat/folyamat-ut";
import type { KapcsolatAllapot } from "@/lib/kapcsolat-allapot";

/**
 * "Folyamat" (#65, #67): where the linked flow stands — a szerződés's, an ajánlatkérés's or a
 * custom Feladat-folyamat's — its status, the shared road of every step (done / running /
 * planned / skipped / late) with each felelős's avatar and deadline, and a link to the flow
 * itself. `feladatId` marks the step this task belongs to.
 */
export function FolyamatPanel({
  allapot: a,
  feladatId,
}: {
  allapot: KapcsolatAllapot;
  feladatId: string;
}) {
  return (
    <section
      className="bg-card flex flex-col gap-4 rounded-lg border p-4"
      aria-labelledby="folyamat"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="folyamat" className="text-muted-foreground text-xs font-medium">
            Folyamat · {a.tipusCimke}
          </h2>
          <Link
            href={a.url}
            className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          >
            {a.cim}
            <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </Link>
          {a.alcim && (
            <p className="text-muted-foreground line-clamp-2 text-xs">{a.alcim}</p>
          )}
        </div>
        <Badge variant={a.allapotTon}>{a.allapotCimke}</Badge>
      </div>
      <FolyamatHaladasSor lepesek={a.lepesek} />

      {a.aktualis ? (
        <p className="text-sm">
          Most: <span className="font-medium">{a.aktualis.nev}</span>
          {a.aktualis.felelosNev && <> — {a.aktualis.felelosNev}</>}
          {a.aktualis.hatarido && (
            <span
              className={cn(
                "tabular-nums",
                a.aktualis.kesik && "text-danger font-medium",
              )}
            >
              {" "}
              · határidő {NAP(a.aktualis.hatarido)}
              {a.aktualis.kesik ? " — lejárt" : ""}
            </span>
          )}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          {a.lezart
            ? "A folyamat lezárult."
            : a.lepesek.length === 0
              ? "Ehhez még nem indítottak folyamatot."
              : "Most egyik lépés sem fut."}
        </p>
      )}

      <FolyamatUt lepesek={a.lepesek} feladatId={feladatId} haladas={false} />
      {(a.kerelmezoNev || a.inditoNev) && (
        <p className="text-muted-foreground text-xs">
          {[
            a.kerelmezoNev && `Kérte: ${a.kerelmezoNev}`,
            a.inditoNev && `Elindította: ${a.inditoNev}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </section>
  );
}
