"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  ExternalLinkIcon,
  MessageSquareIcon,
  StarIcon,
  UndoIcon,
} from "lucide-react";
import { Badge, Button, cn } from "@erp/ui";
import {
  FELADAT_ALLAPOT_LABELS,
  FELADAT_ALLAPOT_TONES,
  monogram,
  szamitoTag,
  type FeladatAllapot,
  type FeladatCsoportTag,
  type FeladatHaladas,
} from "@erp/feladat/client";
import { NAP } from "@/lib/teendo";
import { elsodlegesFelelosAction, feladatVisszavonasAction } from "../actions";
import { MegerositoGomb } from "./megerosito-gomb";
import { useFeladatMuvelet } from "./use-feladat-muvelet";

/** One theme token per state — dots, avatar rings and progress segments share it. */
export const ALLAPOT_SZIN: Record<FeladatAllapot, { pont: string; gyuru: string }> = {
  kiadva: { pont: "bg-info", gyuru: "ring-info" },
  elfogadva: { pont: "bg-warning", gyuru: "ring-warning" },
  elutasitva: { pont: "bg-danger", gyuru: "ring-danger" },
  lezarva: { pont: "bg-success", gyuru: "ring-success" },
  visszavonva: { pont: "bg-muted-foreground", gyuru: "ring-border" },
  tovabbadva: { pont: "bg-muted-foreground", gyuru: "ring-border" },
};

/** Progress segments, done first. */
const SAV_SORREND: FeladatAllapot[] = ["lezarva", "elfogadva", "kiadva", "elutasitva"];

const ido = (iso: string) =>
  new Date(iso).toLocaleString("hu-HU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Budapest",
  });

/** "3/5 kész" with a bar split by state (done, in progress, waiting, refused). */
export function HaladasSav({
  haladas,
  className,
  felirat = true,
}: {
  haladas: FeladatHaladas;
  className?: string;
  felirat?: boolean;
}) {
  const { aktiv, kesz, allapotonkent } = haladas;
  const reszlet = SAV_SORREND.filter((a) => allapotonkent[a])
    .map((a) => `${allapotonkent[a]} ${FELADAT_ALLAPOT_LABELS[a].toLowerCase()}`)
    .join(", ");
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)} title={reszlet}>
      <div
        className="bg-muted flex h-2 min-w-16 flex-1 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={aktiv}
        aria-valuenow={kesz}
        aria-label={`${kesz} / ${aktiv} kész`}
      >
        {aktiv > 0 &&
          SAV_SORREND.map((a) =>
            allapotonkent[a] ? (
              <div
                key={a}
                className={cn(
                  "h-full",
                  ALLAPOT_SZIN[a].pont,
                  a !== "lezarva" && "opacity-60",
                )}
                style={{ width: `${(allapotonkent[a]! / aktiv) * 100}%` }}
              />
            ) : null,
          )}
      </div>
      {felirat && (
        <span className="shrink-0 text-xs font-semibold tabular-nums">
          {kesz}/{aktiv} kész
        </span>
      )}
    </div>
  );
}

/** Initials in a circle, ringed with the member's state colour; a star for the elsődleges. */
export function ResztvevoAvatar({
  tag,
  meret = "sm",
}: {
  tag: Pick<FeladatCsoportTag, "felelosNev" | "allapot" | "elsodleges">;
  meret?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "bg-muted text-foreground ring-background relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2",
        meret === "sm" ? "size-6 text-[10px]" : "size-8 text-xs",
      )}
      title={`${tag.felelosNev} — ${FELADAT_ALLAPOT_LABELS[tag.allapot]}${tag.elsodleges ? " · elsődleges felelős" : ""}`}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full ring-2 ring-inset",
          ALLAPOT_SZIN[tag.allapot].gyuru,
        )}
        aria-hidden
      />
      {monogram(tag.felelosNev)}
      {tag.elsodleges && (
        <StarIcon
          className="text-warning absolute -right-1 -top-1 size-3 fill-current"
          aria-hidden
        />
      )}
    </span>
  );
}

/** Overlapping avatars of the members that count (+N for the rest). */
export function ResztvevoAvatarok({
  tagok,
  max = 5,
}: {
  tagok: FeladatCsoportTag[];
  max?: number;
}) {
  const latszik = tagok.filter(szamitoTag);
  const tobbi = latszik.length - max;
  return (
    <span
      className="flex items-center -space-x-1.5"
      aria-label={`${latszik.length} résztvevő`}
    >
      {latszik.slice(0, max).map((t) => (
        <ResztvevoAvatar key={t.id} tag={t} />
      ))}
      {tobbi > 0 && (
        <span className="bg-muted text-muted-foreground ring-background inline-flex size-6 items-center justify-center rounded-full text-[10px] font-semibold ring-2">
          +{tobbi}
        </span>
      )}
    </span>
  );
}

/**
 * Every member of a group: state, overdue, step progress, the latest comment, handover — and,
 * for the kiadó (`kezel`), per-member actions (make elsődleges, withdraw). `aktivId` highlights
 * the copy on screen; `onValaszt` opens a copy in place instead of navigating.
 */
export function ResztvevokLista({
  tagok,
  aktivId,
  kezel = false,
  csoportHatarido,
  onValaszt,
}: {
  tagok: FeladatCsoportTag[];
  aktivId?: string;
  kezel?: boolean;
  /** The group's deadline — a member's own deadline is shown only when it differs. */
  csoportHatarido?: string;
  onValaszt?: (id: string) => void;
}) {
  const { pending, futtat } = useFeladatMuvelet();
  return (
    <ul className="divide-border flex flex-col divide-y rounded-lg border">
      {tagok.map((t) => {
        const szamit = szamitoTag(t);
        const nyitott =
          t.allapot === "kiadva" ||
          t.allapot === "elfogadva" ||
          t.allapot === "elutasitva";
        return (
          <li
            key={t.id}
            className={cn(
              "flex flex-col gap-1.5 p-2.5 text-sm sm:flex-row sm:items-start sm:gap-3",
              t.id === aktivId && "bg-muted/50",
              !szamit && "text-muted-foreground",
            )}
          >
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <ResztvevoAvatar tag={t} meret="md" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5">
                  {onValaszt ? (
                    <button
                      type="button"
                      onClick={() => onValaszt(t.id)}
                      className="font-medium hover:underline"
                      aria-pressed={t.id === aktivId}
                    >
                      {t.felelosNev}
                    </button>
                  ) : (
                    <Link
                      href={`/feladatok/${t.id}`}
                      className="font-medium hover:underline"
                    >
                      {t.felelosNev}
                    </Link>
                  )}
                  {t.elsodleges && szamit && (
                    <Badge variant="outline" className="gap-1">
                      <StarIcon
                        className="text-warning size-3 fill-current"
                        aria-hidden
                      />
                      Elsődleges
                    </Badge>
                  )}
                  {t.sajat && <Badge variant="outline">Te magad</Badge>}
                  <Badge variant={FELADAT_ALLAPOT_TONES[t.allapot]}>
                    {FELADAT_ALLAPOT_LABELS[t.allapot]}
                  </Badge>
                  {t.kesik && <Badge variant="danger">Lejárt</Badge>}
                  {csoportHatarido && t.hatarido !== csoportHatarido && nyitott && (
                    <span className="text-muted-foreground text-xs">
                      határidő {NAP(t.hatarido)}
                    </span>
                  )}
                </p>
                {t.lepesOsszes > 0 && (
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <div
                      className="bg-muted h-1.5 w-20 overflow-hidden rounded-full"
                      aria-hidden
                    >
                      <div
                        className="bg-success h-full"
                        style={{ width: `${(t.lepesKesz / t.lepesOsszes) * 100}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground tabular-nums">
                      {t.lepesKesz}/{t.lepesOsszes} lépés
                      {t.aktualisLepes && nyitott ? ` · most: ${t.aktualisLepes}` : ""}
                    </span>
                  </div>
                )}
                {t.utolsoMegjegyzes && (
                  <p className="text-muted-foreground mt-1 flex items-start gap-1 text-xs">
                    <MessageSquareIcon className="mt-0.5 size-3 shrink-0" aria-hidden />
                    <span className="line-clamp-2">
                      <span className="text-foreground">
                        {t.utolsoMegjegyzes.szerzoNev ?? "?"}:
                      </span>{" "}
                      {t.utolsoMegjegyzes.szoveg}{" "}
                      <span className="whitespace-nowrap">
                        · {ido(t.utolsoMegjegyzes.mikor)}
                      </span>
                    </span>
                  </p>
                )}
                {t.allapot === "tovabbadva" && t.kovetkezoId && (
                  <Link
                    href={`/feladatok/${t.kovetkezoId}`}
                    className="mt-1 inline-flex items-center gap-1 text-xs hover:underline"
                  >
                    <ArrowRightIcon className="size-3" aria-hidden /> továbbadott példány
                  </Link>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1 pl-10 sm:pl-0">
              {kezel && szamit && !t.elsodleges && t.allapot !== "lezarva" && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => futtat(() => elsodlegesFelelosAction(t.id))}
                  title="Legyen ő az elsődleges felelős"
                >
                  <StarIcon className="size-3.5" aria-hidden />
                  Elsődleges legyen
                </Button>
              )}
              {kezel && nyitott && (
                <MegerositoGomb
                  cimke="Visszavonom tőle"
                  ikon={<UndoIcon className="size-3.5" aria-hidden />}
                  variant="ghost"
                  cim={`Visszavonod ${t.felelosNev} példányát?`}
                  leiras="Csak nála kerül le a feladat, a többiek folytatják."
                  megerosites="Visszavonom"
                  okMezo
                  onConfirm={(indok) => feladatVisszavonasAction(t.id, indok)}
                />
              )}
              {onValaszt && (
                <Link
                  href={`/feladatok/${t.id}`}
                  className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center"
                  title="Példány adatlapja"
                  aria-label={`${t.felelosNev} példányának adatlapja`}
                >
                  <ExternalLinkIcon className="size-3.5" />
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
