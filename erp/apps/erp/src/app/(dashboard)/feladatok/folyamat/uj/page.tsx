import { ArrowLeftIcon } from "lucide-react";
import { requireAuth } from "@erp/auth";
import { Container, ListBackLink } from "@erp/ui";
import { feladatApi, feladatFolyamatApi } from "@erp/feladat";
import { toFeladatViewer } from "@/lib/feladat-viewer";
import { maiNap } from "@/lib/teendo-feed";
import { UjFolyamatForm, type UjFolyamatAlap } from "../_components/uj-folyamat-form";

/**
 * New Feladat-folyamat (#67). `?feladat=<id>`: the kiadó's own open task becomes step 1 and
 * the flow continues from it.
 */
export default async function UjFolyamatPage({
  searchParams,
}: {
  searchParams: Promise<{ feladat?: string }>;
}) {
  const user = await requireAuth();
  const viewer = toFeladatViewer(user);
  const { feladat: feladatId } = await searchParams;
  const [cimzettek, kategoriak, sablonok] = await Promise.all([
    feladatApi.listFeladatCimzettek(viewer),
    feladatApi.listKategoriak(undefined, 200),
    feladatFolyamatApi.listFolyamatSablonok(viewer),
  ]);
  let alap: UjFolyamatAlap | undefined;
  const hozzaadhato = feladatId
    ? await feladatFolyamatApi.folyamatHozzaadhato(viewer, feladatId)
    : null;
  if (feladatId && hozzaadhato) {
    const f = await feladatApi.getFeladat(viewer, feladatId);
    const felelosId = hozzaadhato.felelosId;
    if (f)
      alap = {
        cim: f.cim,
        leiras: f.leiras,
        hatarido: f.hatarido,
        prioritas: f.prioritas,
        kategoria: f.kategoria,
        feladatId,
        elsoLepes: { nev: f.cim, felelosId },
      };
  }
  const emberek = cimzettek.map((c) => ({ id: c.id, nev: c.nev }));
  if (!emberek.some((e) => e.id === user.id))
    emberek.unshift({ id: user.id, nev: user.name || user.email });
  return (
    <Container className="flex max-w-3xl flex-col gap-4 py-6">
      <ListBackLink
        href="/feladatok"
        className="text-muted-foreground inline-flex w-fit items-center gap-1 text-sm hover:underline"
      >
        <ArrowLeftIcon className="size-4" aria-hidden /> Feladatok
      </ListBackLink>
      <div>
        <h1 className="text-xl font-semibold">
          {alap ? "Folyamat hozzáadása a feladathoz" : "Új feladat lépésekkel"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Feladat-folyamat: több ember egymás után dolgozik rajta — lépésenként egy
          felelős.
        </p>
      </div>
      <UjFolyamatForm
        emberek={emberek}
        kategoriak={kategoriak.map((k) => k.nev)}
        sablonok={sablonok}
        ma={maiNap()}
        alap={alap}
      />
    </Container>
  );
}
