import { PROJEKT_ALLAPOT_LABELS, PROJEKT_ALLAPOT_TONES } from "@erp/projekt/client";
import type { ProjektAllapot } from "@erp/projekt/client";
import { Allapot, PageHeader, Tabla } from "@/components/page";
import { datum } from "@/lib/format";
import { getPortalNezo } from "@/lib/portal-nezo";
import { portalProjektek } from "@/lib/portal-api";

export const metadata = { title: "Projektek" };

export default async function ProjektekPage() {
  const nezo = await getPortalNezo();
  const { data } = await portalProjektek(nezo);
  return (
    <>
      <PageHeader title="Projektek" description="Az Önnek megosztott projektek állása." />
      <Tabla
        sorok={data}
        kulcs={(p) => p._id}
        href={(p) => `/projektek/${p._id}`}
        ures="Még nincs megosztott projekt."
        oszlopok={[
          { fejlec: "Azonosító", cella: (p) => p.azonosito },
          { fejlec: "Projekt", cella: (p) => p.nev },
          {
            fejlec: "Állapot",
            cella: (p) => (
              <Allapot
                label={PROJEKT_ALLAPOT_LABELS[p.allapot as ProjektAllapot]}
                tone={PROJEKT_ALLAPOT_TONES[p.allapot as ProjektAllapot]}
              />
            ),
          },
          { fejlec: "Készültség", cella: (p) => `${p.szazalek}%`, jobbra: true },
          { fejlec: "Határidő", cella: (p) => datum(p.hatarido) },
        ]}
      />
    </>
  );
}
