import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { requireAuth } from "@erp/auth";
import { Badge, Container, ListBackLink } from "@erp/ui";
import { feladatApi, feladatFolyamatApi } from "@erp/feladat";
import { FELADAT_PRIORITAS_LABELS, FELADAT_PRIORITAS_TONES } from "@erp/feladat/client";
import { toFeladatViewer } from "@/lib/feladat-viewer";
import { maiNap } from "@/lib/teendo-feed";
import { NAP } from "@/lib/teendo";
import { userKepek } from "@/lib/kapcsolat-allapot";
import {
  FolyamatHaladasSor,
  FolyamatUt,
  SzemelyAvatarok,
} from "@/components/folyamat/folyamat-ut";
import { FolyamatKezeles } from "../_components/folyamat-kezeles";

/**
 * A Feladat-folyamat (#67): the steps as the shared road — who has it now, who comes next,
 * how far it got — and, for the kiadó, editing the planned steps, re-assigning and stopping.
 * Visible to the kiadó, every step's felelős and `hr:feladat:read`.
 */
export default async function FolyamatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const viewer = toFeladatViewer(user);
  const { id } = await params;
  const f = await feladatFolyamatApi.getFolyamat(viewer, id);
  if (!f) notFound();
  const kepek = await userKepek(f.lepesek.map((l) => l.felelosId));
  for (const l of f.lepesek) if (l.felelosId) l.felelosKep = kepek.get(l.felelosId);
  const kezel = f.muveletek.szerkeszt || f.muveletek.megszakit;
  const [cimzettek, sablonok] = kezel
    ? await Promise.all([
        feladatApi.listFeladatCimzettek(viewer),
        feladatFolyamatApi.listFolyamatSablonok(viewer),
      ])
    : [[], []];
  const emberek = cimzettek.map((c) => ({ id: c.id, nev: c.nev }));
  if (kezel && !emberek.some((e) => e.id === user.id))
    emberek.unshift({ id: user.id, nev: user.name || user.email });
  // Every step's felelős by id, for the editor's read-only rows.
  for (const l of f.lepesek)
    if (l.felelosId && l.felelosNev && !emberek.some((e) => e.id === l.felelosId))
      emberek.push({ id: l.felelosId, nev: l.felelosNev });
  const resztvevok = [
    ...new Map(
      f.lepesek.map((l) => [l.felelosId, { nev: l.felelosNev, kep: l.felelosKep }]),
    ).values(),
  ];

  return (
    <Container className="flex max-w-3xl flex-col gap-4 py-6">
      <ListBackLink
        href="/feladatok?nezet=folyamatok&page=1"
        className="text-muted-foreground inline-flex w-fit items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeftIcon className="size-4" aria-hidden /> Követett folyamatok
      </ListBackLink>
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs font-medium">Feladat-folyamat</p>
        <h1 className="text-xl font-semibold">{f.cim}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={f.allapotTon}>{f.allapotCimke}</Badge>
          {f.prioritas !== "normal" && (
            <Badge variant={FELADAT_PRIORITAS_TONES[f.prioritas]}>
              {FELADAT_PRIORITAS_LABELS[f.prioritas]}
            </Badge>
          )}
          {f.kategoria && <Badge variant="outline">{f.kategoria}</Badge>}
          <span className="text-muted-foreground">
            Indította: {f.kiadoNev} · határidő {NAP(f.hatarido)}
          </span>
        </div>
      </header>

      <section
        className="bg-card flex flex-col gap-4 rounded-lg border p-4"
        aria-labelledby="ut"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="ut" className="text-sm font-semibold">
            {f.aktualis
              ? `Most: ${f.aktualis.nev} — ${f.aktualis.felelosNev ?? ""}`
              : f.lezart
                ? f.allapotKulcs === "kesz"
                  ? "A folyamat minden lépése kész."
                  : "A folyamatot megszakították."
                : "Most egyik lépés sem fut."}
          </h2>
          <SzemelyAvatarok szemelyek={resztvevok} />
        </div>
        <FolyamatHaladasSor lepesek={f.lepesek} />
        <FolyamatUt lepesek={f.lepesek} haladas={false} />
        {f.leiras && (
          <p className="text-muted-foreground whitespace-pre-wrap border-t pt-3 text-sm">
            {f.leiras}
          </p>
        )}
      </section>

      {kezel && (
        <FolyamatKezeles
          folyamat={f}
          emberek={emberek}
          sablonok={sablonok}
          ma={maiNap()}
        />
      )}
    </Container>
  );
}
