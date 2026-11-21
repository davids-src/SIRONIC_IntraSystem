import Link from "next/link";
import { requireAuth } from "@erp/auth";
import { Container, cn } from "@erp/ui";
import { feladatApi } from "@erp/feladat";
import { FELADAT_PERMISSIONS } from "@erp/feladat/client";
import { toFeladatViewer } from "@/lib/feladat-viewer";
import {
  csakTeendok,
  feladatTeendo,
  getSajatTaskRefs,
  maiNap,
  refTeendo,
} from "@/lib/teendo-feed";
import {
  LISTA_CSOPORTOSITASOK,
  feladatSorok,
  folyamatHaladasMezok,
  rendez,
  teendoSor,
  type ListaCsoportositas,
  type ListaSor,
} from "@/lib/feladat-lista";
import {
  folyamatSzoveg,
  kapcsolatAllapotok,
  resztvevoKepekkel,
  kovetettFolyamatok,
  type KapcsolatAllapot,
} from "@/lib/kapcsolat-allapot";
import { FeladatLista, type ListaNezet } from "./_components/feladat-lista";
import { CsoportositottLista } from "./_components/csoportositott-lista";
import { KovetettFolyamatok, type KovetettSor } from "./_components/kovetett-folyamatok";
import { UjFeladatForm } from "./_components/uj-feladat-form";
import { GyorsSajatFeladat } from "./_components/gyors-sajat-feladat";
import { Kimutatas } from "./_components/kimutatas";
import { ErtesitesKapcsolo } from "../_components/ertesites-kapcsolo";

/** Given-out and everyone's lists open on the open tasks — a filter the user can clear. */
const NYITOTT_SZURO = "&f.allapot=kiadva&f.allapot=elfogadva&f.allapot=elutasitva";
const fulHref = (n: string) =>
  // `page=1`: a view never inherits another view's remembered filters.
  `/feladatok?nezet=${n}&page=1${
    n === "kiadott" || n === "mind"
      ? NYITOTT_SZURO
      : n === "folyamatok"
        ? "&f.helyzet=nyitott"
        : ""
  }`;

/**
 * Linked rows get the entity flow's state as an extra line (#65) — one lookup per module for
 * the whole list.
 */
async function folyamattal(sorok: ListaSor[]): Promise<ListaSor[]> {
  const refs = [
    ...new Set(sorok.flatMap((s) => (s.kapcsolatKulcs ? [s.kapcsolatKulcs] : []))),
  ].map((k) => {
    const [modul = "", tipus = "", ...id] = k.split(":");
    return { modul, tipus, id: id.join(":") };
  });
  if (refs.length === 0) return resztvevoKepekkel(sorok);
  const allapotok = await kapcsolatAllapotok(refs);
  return resztvevoKepekkel(
    sorok.map((s) => {
      const a = s.kapcsolatKulcs ? allapotok.get(s.kapcsolatKulcs) : undefined;
      // A step of a flow shows the whole flow's progress and people (#67).
      return a ? { ...s, folyamat: folyamatSzoveg(a), ...folyamatHaladasMezok(a) } : s;
    }),
  );
}

function kovetettSor(a: KapcsolatAllapot): KovetettSor {
  const szamit = a.lepesek.filter((l) => l.allapot !== "kihagyva");
  return {
    _id: `${a.tipus}:${a.id}`,
    href: a.url,
    tipus: a.tipus,
    tipusCimke: a.tipusCimke,
    cim: a.cim,
    alcim: a.alcim,
    allapot: a.allapotKulcs,
    allapotCimke: a.allapotCimke,
    allapotTon: a.allapotTon,
    helyzet: a.lezart ? "lezart" : "nyitott",
    lepes: a.aktualis?.nev ?? "",
    haladas: szamit.length
      ? `${szamit.filter((l) => l.allapot === "kesz").length}/${szamit.length}`
      : "",
    felelos: a.aktualis?.felelosNev ?? "",
    hatarido: a.aktualis?.hatarido ?? "",
    kesik: a.kesik,
    szerep: (a.szerepek ?? []).join(","),
    frissitve: a.frissitve,
  };
}

const NEZETEK = {
  teendoim: "Teendőim",
  kiadott: "Általam kiadott",
  lezart: "Lezártak",
  mind: "Mindenki feladatai",
  folyamatok: "Követett folyamatok",
  kimutatas: "Kimutatás",
} as const;
type Nezet = keyof typeof NEZETEK;

/**
 * Feladatok (rebuilt 2026-11-19). Tabs on top, one system table per view below — a click on a
 * row opens the task. Teendőim adds a short summary (what is overdue, due today, waiting for
 * acceptance — each a filter link) and a one-line form for an own task.
 */
export default async function FeladatokPage({
  searchParams,
}: {
  searchParams: Promise<{ nezet?: string; napok?: string; csoport?: string }>;
}) {
  const user = await requireAuth();
  const viewer = toFeladatViewer(user);
  const sp = await searchParams;
  const mindent = user.permissions.includes(FELADAT_PERMISSIONS.read);
  const nezetek = (Object.keys(NEZETEK) as Nezet[]).filter(
    (n) => (n !== "mind" && n !== "kimutatas") || mindent,
  );
  // Old links used `nezet=kapott` for the received list.
  const kert = sp.nezet === "kapott" ? "teendoim" : sp.nezet;
  const nezet: Nezet = nezetek.includes(kert as Nezet) ? (kert as Nezet) : "teendoim";
  const ma = maiNap();
  const [cimzettek, nezetDb, kategoriaLista] = await Promise.all([
    feladatApi.listFeladatCimzettek(viewer),
    feladatApi.countFeladatNezetek(viewer),
    feladatApi.listKategoriak(undefined, 100),
  ]);
  const kategoriak = kategoriaLista.map((k) => k.nev);
  // Grouped list (#65): `?csoport=kategoria|felelos|kiado` on the task lists.
  const csoport = (Object.keys(LISTA_CSOPORTOSITASOK) as ListaCsoportositas[]).find(
    (c) => c === sp.csoport,
  );
  const listaNezet =
    nezet === "teendoim" || nezet === "kiadott" || nezet === "lezart" || nezet === "mind";
  const lista = (sorok: ListaSor[], ures: string, n: ListaNezet) =>
    csoport ? (
      <CsoportositottLista sorok={sorok} szerint={csoport} ures={ures} />
    ) : (
      <FeladatLista sorok={sorok} nezet={n} ma={ma} ures={ures} />
    );

  let tartalom: React.ReactNode;
  let teendoDb: number | undefined;

  if (nezet === "folyamatok") {
    const sorok = (await kovetettFolyamatok(user.id)).map(kovetettSor);
    tartalom = (
      <>
        <p className="text-muted-foreground -mt-2 text-sm">
          A szerződések és ajánlatkérések, amiket kértél, elindítottál, vagy amelyeknek
          egy lépése a tiéd: hol tart, kinél van most, és mikorra kell elkészülnie.
          Kattints egy sorra a részletekért.
        </p>
        <KovetettFolyamatok sorok={sorok} />
      </>
    );
  } else if (nezet === "kimutatas") {
    const napok = [30, 90, 365, 0].includes(Number(sp.napok)) ? Number(sp.napok) : 90;
    const adat = await feladatApi.getFeladatKimutatas(viewer, napok || undefined);
    tartalom = adat ? <Kimutatas adat={adat} napok={napok} /> : null;
  } else if (nezet === "teendoim") {
    const [refs, kapott, kiadott] = await Promise.all([
      getSajatTaskRefs(user.id),
      feladatApi.listFeladatok(viewer, { nezet: "kapott", allapot: "nyitott" }),
      feladatApi.listFeladatok(viewer, { nezet: "kiadott", allapot: "nyitott" }),
    ]);
    const sorok = await folyamattal(
      rendez(
        [
          ...kapott.map(feladatTeendo),
          ...kiadott.filter((f) => f.allapot === "elutasitva").map(feladatTeendo),
          ...csakTeendok(refs)
            .filter((t) => t.module !== "feladat")
            .map(refTeendo),
        ].map((t) => teendoSor(t, ma)),
      ),
    );
    teendoDb = sorok.length;
    tartalom = (
      <>
        <Osszegzes sorok={sorok} />
        <GyorsSajatFeladat ma={ma} kategoriak={kategoriak} />
        {lista(sorok, "Nincs rád váró teendő.", "teendoim")}
      </>
    );
  } else {
    const sorok: ListaSor[] =
      nezet === "lezart"
        ? await (async () => {
            const [kapott, kiadott] = await Promise.all([
              feladatApi.listFeladatok(viewer, { nezet: "kapott", allapot: "lezart" }),
              feladatApi.listFeladatok(viewer, { nezet: "kiadott", allapot: "lezart" }),
            ]);
            const osszes = [
              ...kapott,
              ...kiadott.filter((k) => !kapott.some((f) => f.id === k.id)),
            ];
            return feladatSorok(osszes, ma).sort((a, b) =>
              b.createdAt.localeCompare(a.createdAt),
            );
          })()
        : rendez(
            feladatSorok(
              await feladatApi.listFeladatok(viewer, { nezet, allapot: "mind" }),
              ma,
            ),
          );
    tartalom = lista(
      await folyamattal(sorok),
      nezet === "kiadott"
        ? "Még nem adtál ki feladatot. Az „Új feladat” gombbal adhatsz ki."
        : nezet === "lezart"
          ? "Nincs lezárt feladat."
          : "Nincs feladat.",
      nezet as ListaNezet,
    );
  }

  const fulDb: Partial<Record<Nezet, number>> = {
    teendoim: teendoDb,
    kiadott: nezetDb.kiadott,
    mind: nezetDb.mind,
  };

  return (
    <Container className="flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Feladatok</h1>
          <p className="text-muted-foreground text-sm">
            A kollégáktól kapott és a saját feladataid, valamint a többi modul rád váró
            tételei.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ErtesitesKapcsolo />
          {/* Feladat-folyamat (#67): steps one after another, one felelős each. */}
          <Link
            href="/feladatok/folyamat/uj"
            className="border-input hover:bg-muted inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium"
          >
            Új folyamat
          </Link>
          <UjFeladatForm
            cimzettek={cimzettek}
            ma={ma}
            sajatId={user.id}
            kategoriak={kategoriak}
          />
        </div>
      </div>

      <nav className="-mb-1 flex gap-1 overflow-x-auto border-b" aria-label="Nézet">
        {nezetek.map((n) => (
          <Link
            key={n}
            href={fulHref(n)}
            aria-current={n === nezet ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium",
              n === nezet
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {NEZETEK[n]}
            {fulDb[n] ? (
              <span className="bg-muted text-foreground rounded-full px-2 text-xs tabular-nums">
                {fulDb[n]}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      {listaNezet && (
        <nav
          className="-mt-2 flex flex-wrap items-center gap-1.5 text-xs"
          aria-label="Csoportosítás"
          data-export="skip"
        >
          <span className="text-muted-foreground mr-1">Csoportosítás:</span>
          {(
            [undefined, ...Object.keys(LISTA_CSOPORTOSITASOK)] as Array<
              ListaCsoportositas | undefined
            >
          ).map((c) => (
            <Link
              key={c ?? "nincs"}
              href={c ? `/feladatok?nezet=${nezet}&csoport=${c}` : fulHref(nezet)}
              aria-current={c === csoport ? "true" : undefined}
              className={cn(
                "rounded-full px-3 py-1 font-medium",
                c === csoport
                  ? "bg-foreground text-background"
                  : "bg-muted hover:bg-accent",
              )}
            >
              {c ? LISTA_CSOPORTOSITASOK[c] : "Nincs"}
            </Link>
          ))}
        </nav>
      )}

      {tartalom}
    </Container>
  );
}

/** Four counts — each one a link that filters the table below to just those rows. */
function Osszegzes({ sorok }: { sorok: ListaSor[] }) {
  const lejart = sorok.filter((s) => s.sav === "lejart").length;
  const ma = sorok.filter((s) => s.sav === "ma").length;
  const var_ = sorok.filter((s) => s.allapot === "elfogadasra_var").length;
  const alap = "/feladatok?nezet=teendoim&page=1";
  const elemek: Array<{ cimke: string; db: number; href: string; ton?: string }> = [
    { cimke: "Összes nyitott", db: sorok.length, href: alap },
    {
      cimke: "Lejárt",
      db: lejart,
      href: `${alap}&f.sav=lejart`,
      ton: lejart ? "text-danger" : "",
    },
    {
      cimke: "Ma esedékes",
      db: ma,
      href: `${alap}&f.sav=ma`,
      ton: ma ? "text-warning" : "",
    },
    {
      cimke: "Elfogadásra vár",
      db: var_,
      href: `${alap}&f.allapot=elfogadasra_var`,
      ton: var_ ? "text-info" : "",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {elemek.map((e) => (
        <Link
          key={e.cimke}
          href={e.href}
          className="bg-card hover:bg-muted/40 rounded-lg border p-3 transition-colors"
        >
          <span className="text-muted-foreground block text-xs font-medium">
            {e.cimke}
          </span>
          <span className={cn("block text-2xl font-semibold tabular-nums", e.ton)}>
            {e.db}
          </span>
        </Link>
      ))}
    </div>
  );
}
