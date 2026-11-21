import { JOTALLAS_ALLAPOT_LABELS, JOTALLAS_ALLAPOT_TONES } from "@erp/bizonylat/client";
import { Allapot, PageHeader, Tabla } from "@/components/page";
import { datum } from "@/lib/format";
import { getPortalNezo } from "@/lib/portal-nezo";
import { portalJotallasok } from "@/lib/portal-api";

export const metadata = { title: "Jótállások" };

export default async function JotallasokPage() {
  const nezo = await getPortalNezo();
  const { data } = await portalJotallasok(nezo);
  return (
    <>
      <PageHeader
        title="Jótállások"
        description="A termékeire kiállított jótállási jegyek."
      />
      <Tabla
        sorok={data}
        kulcs={(j) => j.id}
        href={(j) => `/jotallasok/${j.id}`}
        ures="Még nincs jótállási jegy."
        oszlopok={[
          { fejlec: "Azonosító", cella: (j) => j.azonosito },
          {
            fejlec: "Termékek",
            cella: (j) => j.sorok.map((s) => s.termekNev).join(", "),
          },
          {
            fejlec: "Állapot",
            cella: (j) => (
              <Allapot
                label={JOTALLAS_ALLAPOT_LABELS[j.allapot]}
                tone={JOTALLAS_ALLAPOT_TONES[j.allapot]}
              />
            ),
          },
          { fejlec: "Kiállítva", cella: (j) => datum(j.kiallitasNap) },
          { fejlec: "Lejárat", cella: (j) => datum(j.lejarat) },
        ]}
      />
    </>
  );
}
