import type { ReactNode } from "react";
import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, cn } from "@erp/ui";
import {
  FOLYAMAT_LEPES_ALLAPOT_LABELS,
  folyamatHaladas,
  type FolyamatLepesNezet,
} from "@erp/core/folyamat";
import { monogram } from "@erp/feladat/client";
import { NAP } from "@/lib/teendo";

/**
 * The one "folyamat road" (#67): every flow — a Feladat-folyamat, a szerződés's phases, an
 * ajánlatkérés's stages — is drawn by this component, from the shared `FolyamatLepesNezet`.
 */

/** Profile picture or initials. */
export function SzemelyAvatar({
  nev,
  kep,
  meret = "sm",
  className,
}: {
  nev?: string;
  kep?: string;
  meret?: "xs" | "sm" | "md";
  className?: string;
}) {
  const m =
    meret === "xs"
      ? "size-5 text-[9px]"
      : meret === "sm"
        ? "size-6 text-[10px]"
        : "size-8 text-xs";
  return (
    <Avatar className={cn(m, "ring-background ring-2", className)} title={nev}>
      {kep && <AvatarImage src={kep} alt={nev ?? ""} />}
      <AvatarFallback className="font-semibold">{monogram(nev ?? "?")}</AvatarFallback>
    </Avatar>
  );
}

/** Overlapping avatars (+N). */
export function SzemelyAvatarok({
  szemelyek,
  max = 5,
}: {
  szemelyek: Array<{ nev?: string; kep?: string }>;
  max?: number;
}) {
  const tobbi = szemelyek.length - max;
  return (
    <span
      className="flex items-center -space-x-1.5"
      aria-label={`${szemelyek.length} résztvevő`}
    >
      {szemelyek.slice(0, max).map((s, i) => (
        <SzemelyAvatar key={`${s.nev}-${i}`} nev={s.nev} kep={s.kep} />
      ))}
      {tobbi > 0 && (
        <span className="bg-muted text-muted-foreground ring-background inline-flex size-6 items-center justify-center rounded-full text-[10px] font-semibold ring-2">
          +{tobbi}
        </span>
      )}
    </span>
  );
}

/** "2/4 lépés · 50%" with a bar. */
export function FolyamatHaladasSor({
  lepesek,
  className,
}: {
  lepesek: Array<{ allapot: string }>;
  className?: string;
}) {
  const h = folyamatHaladas(lepesek);
  if (h.osszes === 0) return null;
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <div
        className="bg-muted h-1.5 min-w-16 flex-1 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={h.osszes}
        aria-valuenow={h.kesz}
        aria-label={`${h.kesz} / ${h.osszes} lépés kész`}
      >
        <div className="bg-success h-full" style={{ width: `${h.szazalek}%` }} />
      </div>
      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
        {h.kesz}/{h.osszes} lépés · {h.szazalek}%
      </span>
    </div>
  );
}

/**
 * Every step in order: number / tick, name, felelős avatar + name, deadline, state; the running
 * step highlighted, late ones in red. `feladatId` marks the step of the task on screen.
 */
export function FolyamatUt({
  lepesek,
  feladatId,
  haladas = true,
  extra,
}: {
  lepesek: FolyamatLepesNezet[];
  feladatId?: string;
  haladas?: boolean;
  /** Module-specific content under a step (comments, re-assign controls) — by step. */
  extra?: (lepes: FolyamatLepesNezet) => ReactNode;
}) {
  if (lepesek.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {haladas && <FolyamatHaladasSor lepesek={lepesek} />}
      <ol className="flex flex-col" aria-label="Lépések">
        {lepesek.map((l, i) => {
          const kesz = l.allapot === "kesz";
          const kihagyva = l.allapot === "kihagyva";
          const hiba = l.allapot === "elutasitva" || l.allapot === "megszakitva";
          const ez = Boolean(feladatId) && l.feladatId === feladatId;
          return (
            <li
              key={l.kulcs}
              className={cn(
                "grid grid-cols-[1.25rem_1fr] gap-x-3 border-l-2 py-2 pl-3",
                l.aktualis ? "border-primary" : kesz ? "border-success" : "border-border",
                (ez || l.aktualis) && "bg-muted/40 rounded-r",
              )}
              aria-current={l.aktualis ? "step" : undefined}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 items-center justify-center rounded-full border text-[10px]",
                  kesz && "border-success bg-success text-success-foreground",
                  l.aktualis && "border-primary bg-primary text-primary-foreground",
                  kihagyva && "border-dashed",
                )}
                aria-hidden
              >
                {kesz ? <CheckIcon className="size-3" /> : i + 1}
              </span>
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "flex flex-wrap items-baseline gap-x-2 text-sm",
                      kihagyva && "text-muted-foreground line-through",
                    )}
                  >
                    <span className={cn(l.aktualis && "font-semibold")}>{l.nev}</span>
                    {l.aktualis && (
                      <span className="text-primary text-xs font-medium">most</span>
                    )}
                    {ez && (
                      <span className="text-muted-foreground text-xs">
                        ← ez a feladat
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
                    <span
                      className={cn(
                        hiba && "text-danger",
                        l.kesik && "text-danger font-medium",
                      )}
                    >
                      {l.kesik ? "Lejárt" : FOLYAMAT_LEPES_ALLAPOT_LABELS[l.allapot]}
                    </span>
                    {l.felelosNev && <span>· {l.felelosNev}</span>}
                    {l.hatarido && !kihagyva && (
                      <span className="tabular-nums">· {NAP(l.hatarido)}</span>
                    )}
                    {l.feladatId && !ez && (
                      <Link
                        href={`/feladatok/${l.feladatId}`}
                        className="hover:underline"
                      >
                        · feladat
                      </Link>
                    )}
                  </p>
                  {l.megjegyzes && hiba && !extra && (
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                      „{l.megjegyzes}”
                    </p>
                  )}
                  {extra?.(l)}
                </div>
                {l.felelosNev && !kihagyva && (
                  <SzemelyAvatar nev={l.felelosNev} kep={l.felelosKep} meret="md" />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
