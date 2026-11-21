import {
  FIZETES_ALLAPOT_LABELS,
  FIZETES_ALLAPOT_TONES,
  SZAMLAZASI_CIKLUS_LABELS,
  TELEPITES_ALLAPOT_LABELS,
  TELEPITES_ALLAPOT_TONES,
} from "@erp/deployments/client";
import { Allapot, PageHeader, Tabla } from "@/components/page";
import { datum, huf } from "@/lib/format";
import { getPortalNezo } from "@/lib/portal-nezo";
import { portalFizetesek, portalTelepitesek } from "@/lib/portal-api";

export const metadata = { title: "Telepítések" };

export default async function TelepitesekPage() {
  const nezo = await getPortalNezo();
  const [telepitesek, fizetesek] = await Promise.all([
    portalTelepitesek(nezo),
    portalFizetesek(nezo),
  ]);
  return (
    <>
      <PageHeader title="Telepítések" description="Az Ön weboldalai és szolgáltatásai." />
      <Tabla
        sorok={telepitesek}
        kulcs={(t) => t.id}
        ures="Nincs megtekinthető telepítés. Ha vártnak ennél többet, kérje a cége portál-adminisztrátorát a hozzáférés beállítására."
        oszlopok={[
          { fejlec: "Megnevezés", cella: (t) => t.nev },
          { fejlec: "Domain", cella: (t) => t.domain ?? "—" },
          {
            fejlec: "Állapot",
            cella: (t) =>
              t.allapot && (
                <Allapot
                  label={TELEPITES_ALLAPOT_LABELS[t.allapot]}
                  tone={TELEPITES_ALLAPOT_TONES[t.allapot]}
                />
              ),
          },
          { fejlec: "Csomag", cella: (t) => t.csomagNev ?? "—" },
          {
            fejlec: "Díj",
            cella: (t) =>
              t.arHuf !== undefined
                ? `${huf(t.arHuf)}${t.ciklus ? ` / ${SZAMLAZASI_CIKLUS_LABELS[t.ciklus]}` : ""}`
                : "—",
            jobbra: true,
          },
          { fejlec: "Utolsó fizetés", cella: (t) => datum(t.utolsoFizetes) },
        ]}
      />
      <h2 className="mt-8 mb-2 font-medium">Díjak</h2>
      <Tabla
        sorok={fizetesek}
        kulcs={(f) => f.id}
        ures="Még nincs rögzített díj."
        oszlopok={[
          {
            fejlec: "Időszak",
            cella: (f) => `${datum(f.idoszakKezdet)} – ${datum(f.idoszakVeg)}`,
          },
          { fejlec: "Összeg", cella: (f) => huf(f.osszegHuf), jobbra: true },
          {
            fejlec: "Állapot",
            cella: (f) =>
              f.allapot && (
                <Allapot
                  label={FIZETES_ALLAPOT_LABELS[f.allapot]}
                  tone={FIZETES_ALLAPOT_TONES[f.allapot]}
                />
              ),
          },
          { fejlec: "Fizetve", cella: (f) => datum(f.fizetve) },
        ]}
      />
    </>
  );
}
