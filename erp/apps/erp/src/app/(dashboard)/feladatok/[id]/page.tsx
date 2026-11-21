import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { requireAuth } from "@erp/auth";
import { Badge, Container, ListBackLink, cn } from "@erp/ui";
import { feladatApi, feladatFolyamatApi, feladatUzenetApi } from "@erp/feladat";
import {
  FELADAT_ALLAPOT_LABELS,
  FELADAT_ALLAPOT_TONES,
  FELADAT_PRIORITAS_LABELS,
  FELADAT_PRIORITAS_TONES,
  osszesitettAllapot,
  szamitoTag,
  kapcsolatCimke,
} from "@erp/feladat/client";
import { getVedettMediaMeta } from "@erp/media";
import { toFeladatViewer } from "@/lib/feladat-viewer";
import { maiNap } from "@/lib/teendo-feed";
import { NAP } from "@/lib/teendo";
import { FeladatTeendo } from "../_components/feladat-teendo";
import { Beszelgetes } from "../_components/beszelgetes";
import { FeladatSzovegSzerkeszto } from "../_components/szoveg-szerkeszto";
import { CsatolmanyLista } from "../_components/csatolmany";
import { LepesekPanel } from "../_components/lepesek-panel";
import { CsoportMuveletek } from "../_components/csoport-muveletek";
import { HaladasSav, ResztvevokLista } from "../_components/resztvevok";
import { FolyamatPanel } from "../_components/folyamat-panel";
import { kapcsolatAllapot } from "@/lib/kapcsolat-allapot";

const ido = (iso: string) =>
  new Date(iso).toLocaleString("hu-HU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Budapest",
  });

const SZEREP_LABELS = {
  kiado: "Te adtad ki",
  felelos: "Te vagy a felelős",
  kozremukodo: "Közreműködő (csak olvasod)",
  megfigyelo: "Csak olvasod",
} as const;

const NYITOTT = new Set(["kiadva", "elfogadva", "elutasitva"]);

/**
 * One task on its own page (rebuilt 2026-11-19) — what every list row and push notification
 * opens. Top: the state as a road and what to do next. Then the description, the steps, the
 * members of a group task, the conversation, and the log. Visible to the kiadó, the felelős,
 * earlier felelősök of a handed-on task, the other members of a group task and (read-only)
 * `hr:feladat:read`; for anyone else it is a 404, so an id alone reveals nothing.
 */
export default async function FeladatAdatlapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const viewer = toFeladatViewer(user);
  const { id } = await params;
  const feladat = await feladatApi.getFeladat(viewer, id);
  if (!feladat) notFound();
  const csoport = feladat.csoport;
  const kiado = feladat.szerep === "kiado";
  // One shared conversation for everyone on the task (#68); opening the page marks it read.
  const szal = await feladatUzenetApi.getFeladatSzal(viewer, feladat.id, {
    olvasott: true,
  });
  const kezel = csoport
    ? kiado && csoport.tagok.some((t) => NYITOTT.has(t.allapot))
    : feladat.muveletek.kezel;
  const cimzettek =
    feladat.muveletek.ujrakiad || feladat.muveletek.tovabbad || kezel
      ? await feladatApi.listFeladatCimzettek(viewer)
      : [];
  const ma = maiNap();
  // Attachment names come from the protected media store (the task keeps only ids, #47).
  const meta = await getVedettMediaMeta([
    ...feladat.mediaIds,
    ...(szal?.uzenetek ?? []).flatMap((m) => m.mediaIds),
  ]);
  const media = Object.fromEntries(meta.map((m) => [m.id, m]));
  const sablonok = feladat.muveletek.lepesek
    ? await feladatApi.listLepesSablonok(viewer)
    : [];
  const [folyamat, kategoriak, folyamatAdhato] = await Promise.all([
    // Linked task: where the contract's / request's / Feladat-folyamat's flow stands (#65, #67).
    feladat.kapcsolat ? kapcsolatAllapot(feladat.kapcsolat) : undefined,
    kezel ? feladatApi.listKategoriak(undefined, 100) : [],
    // The kiadó may turn a plain open task into step 1 of a Feladat-folyamat (#67).
    kiado && !csoport && !feladat.kapcsolat
      ? feladatFolyamatApi.folyamatHozzaadhato(viewer, feladat.id)
      : null,
  ]);
  const feladatCsatolmanyok = feladat.mediaIds.flatMap((m) =>
    media[m] ? [media[m]] : [],
  );
  const nyitottTagok = csoport ? csoport.tagok.filter((t) => NYITOTT.has(t.allapot)) : [];
  const csoportHatarido =
    nyitottTagok.map((t) => t.hatarido).sort()[0] ?? feladat.hatarido;
  const allapot = csoport && kiado ? osszesitettAllapot(csoport.tagok) : feladat.allapot;

  return (
    <Container className="flex max-w-6xl flex-col gap-5">
      <header className="flex flex-col gap-2">
        <ListBackLink
          href="/feladatok"
          className="text-muted-foreground inline-flex w-fit items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeftIcon className="size-4" aria-hidden /> Feladatok
        </ListBackLink>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-2xl font-bold leading-tight">{feladat.cim}</h1>
          {kiado && (
            <FeladatSzovegSzerkeszto
              id={feladat.id}
              cim={feladat.cim}
              leiras={feladat.leiras}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={FELADAT_ALLAPOT_TONES[allapot]}>
            {FELADAT_ALLAPOT_LABELS[allapot]}
          </Badge>
          {feladat.prioritas !== "normal" && (
            <Badge variant={FELADAT_PRIORITAS_TONES[feladat.prioritas]}>
              {FELADAT_PRIORITAS_LABELS[feladat.prioritas]}
            </Badge>
          )}
          <span className="text-muted-foreground">
            Határidő:{" "}
            <span
              className={cn("tabular-nums", feladat.kesik && "text-danger font-medium")}
            >
              {NAP(feladat.hatarido)}
              {feladat.kesik ? " — lejárt" : ""}
            </span>
          </span>
          {csoport && (
            <span className="text-muted-foreground">
              · Csoportos, {csoport.tagok.filter(szamitoTag).length} fő
              {kiado ? "" : ` · ${feladat.felelosNev} példánya`}
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <FeladatTeendo
            feladat={feladat}
            cimzettek={cimzettek}
            ma={ma}
            peldany={csoport && kiado ? feladat.felelosNev : undefined}
          />

          {folyamat && <FolyamatPanel allapot={folyamat} feladatId={feladat.id} />}
          {folyamatAdhato && (
            <section
              className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              aria-label="Folyamat"
            >
              <p className="text-muted-foreground min-w-0 flex-1 text-sm">
                Több ember dolgozik rajta egymás után? Adj hozzá lépéseket: ha{" "}
                {feladat.felelosNev} elkészül, a következő lépés felelőse automatikusan
                megkapja.
              </p>
              <Link
                href={`/feladatok/folyamat/uj?feladat=${feladat.id}`}
                className="border-input hover:bg-muted inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium"
              >
                Folyamat hozzáadása
              </Link>
            </section>
          )}

          {(feladat.leiras || feladatCsatolmanyok.length > 0) && (
            <section className="bg-card rounded-lg border p-4" aria-label="Leírás">
              <h2 className="mb-2 text-sm font-semibold">Leírás</h2>
              {feladat.leiras && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {feladat.leiras}
                </p>
              )}
              {feladatCsatolmanyok.length > 0 && (
                <CsatolmanyLista className="mt-3" csatolmanyok={feladatCsatolmanyok} />
              )}
            </section>
          )}

          {(feladat.lepesek.length > 0 || feladat.muveletek.lepesek) && (
            <section
              className="bg-card rounded-lg border p-4"
              aria-label="Saját részlépések"
            >
              <h2 className="text-sm font-semibold">Saját részlépések</h2>
              <p className="text-muted-foreground mb-2 text-xs">
                A felelős saját teendőlistája ehhez a feladathoz — több embert érintő
                lépésekhez használj Feladat-folyamatot.
              </p>
              <LepesekPanel
                feladatId={feladat.id}
                lepesek={feladat.lepesek}
                szerkesztheto={feladat.muveletek.lepesek}
                sablonok={sablonok}
              />
            </section>
          )}

          {(kezel || csoport) && (
            <section className="bg-card flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">
                  {csoport
                    ? `Résztvevők · ${csoport.haladas.aktiv} fő`
                    : "Határidő, prioritás, kategória"}
                </h2>
                {csoport && (
                  <HaladasSav haladas={csoport.haladas} className="w-56 max-w-full" />
                )}
              </div>
              {kezel && (
                <CsoportMuveletek
                  id={feladat.id}
                  cim={feladat.cim}
                  hatarido={csoportHatarido}
                  prioritas={feladat.prioritas}
                  csoportos={Boolean(csoport)}
                  kapcsolt={Boolean(feladat.kapcsolat)}
                  tagIds={(csoport?.tagok ?? [])
                    .filter(szamitoTag)
                    .flatMap((t) => (t.felelosId ? [t.felelosId] : []))}
                  nyitottDb={csoport ? nyitottTagok.length : 1}
                  cimzettek={cimzettek}
                  sajatId={user.id}
                  ma={ma}
                  kategoria={feladat.kategoria}
                  kategoriak={kategoriak.map((k) => k.nev)}
                />
              )}
              {csoport && (
                <ResztvevokLista
                  tagok={csoport.tagok}
                  aktivId={feladat.id}
                  kezel={kezel}
                  csoportHatarido={csoportHatarido}
                />
              )}
              {csoport && !kiado && (
                <p className="text-muted-foreground text-xs">
                  Mindenki a saját példányán dolgozik és zárja le; a többiek állapotát itt
                  látod.
                </p>
              )}
            </section>
          )}

          {szal && (
            <Beszelgetes
              feladatId={feladat.id}
              szal={szal}
              media={media}
              sajatId={user.id}
            />
          )}

          <details className="bg-card group rounded-lg border">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">
              Előzmények
              <span className="text-muted-foreground ml-2 text-xs font-normal">
                {feladat.naplo.length} bejegyzés
              </span>
            </summary>
            <ol className="flex flex-col gap-2 border-t px-4 py-3 text-sm">
              {feladat.naplo.map((a, i) => (
                <li key={i} className="grid gap-x-3 sm:grid-cols-[8rem_1fr]">
                  <span className="text-muted-foreground text-xs tabular-nums sm:pt-0.5">
                    {ido(a.mikor)}
                  </span>
                  <span>
                    <span className="font-medium">
                      {FELADAT_ALLAPOT_LABELS[a.allapot]}
                    </span>
                    {a.kiNev && (
                      <span className="text-muted-foreground"> · {a.kiNev}</span>
                    )}
                    {a.megjegyzes && <span className="block">{a.megjegyzes}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        </div>

        <aside className="flex flex-col gap-5">
          <dl className="bg-card grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 rounded-lg border p-4 text-sm">
            <dt className="text-muted-foreground">Kiadta</dt>
            <dd>{feladat.sajat ? "Saját feladat" : feladat.kiadoNev}</dd>
            {!feladat.sajat && (
              <>
                <dt className="text-muted-foreground">Felelős</dt>
                <dd>
                  {feladat.felelosNev}
                  {feladat.elsodleges !== undefined && (
                    <span className="text-muted-foreground block text-xs">
                      {feladat.elsodleges ? "elsődleges felelős" : "közreműködő"}
                    </span>
                  )}
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Határidő</dt>
            <dd
              className={cn("tabular-nums", feladat.kesik && "text-danger font-medium")}
            >
              {NAP(feladat.hatarido)}
            </dd>
            <dt className="text-muted-foreground">
              {feladat.sajat ? "Felvéve" : "Kiadva"}
            </dt>
            <dd className="tabular-nums">{ido(feladat.createdAt)}</dd>
            <dt className="text-muted-foreground">Kategória</dt>
            <dd>
              {feladat.kategoria ?? <span className="text-muted-foreground">—</span>}
            </dd>
            <dt className="text-muted-foreground">Szereped</dt>
            <dd>{SZEREP_LABELS[feladat.szerep]}</dd>
            {feladat.kapcsolat && (
              <>
                <dt className="text-muted-foreground">Kapcsolódik</dt>
                <dd>
                  <Link
                    href={feladat.kapcsolat.url}
                    className="underline-offset-2 hover:underline"
                  >
                    {kapcsolatCimke(feladat.kapcsolat)}
                  </Link>
                </dd>
              </>
            )}
          </dl>

          {(feladat.elozmenyId || feladat.kovetkezoId) && (
            <section className="bg-card flex flex-col gap-1.5 rounded-lg border p-4 text-sm">
              <h2 className="font-semibold">Átadási lánc</h2>
              <p className="text-muted-foreground text-xs">
                Ki kinek, miért adta tovább: lásd az Előzményeket.
              </p>
              {feladat.elozmenyId && (
                <Link
                  href={`/feladatok/${feladat.elozmenyId}`}
                  className="underline-offset-2 hover:underline"
                >
                  Előző felelős példánya
                </Link>
              )}
              {feladat.kovetkezoId && (
                <Link
                  href={`/feladatok/${feladat.kovetkezoId}`}
                  className="underline-offset-2 hover:underline"
                >
                  Továbbadott példány
                </Link>
              )}
            </section>
          )}
        </aside>
      </div>
    </Container>
  );
}
