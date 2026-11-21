import { IGAZOLAS_ALLAPOT_LABELS, IGAZOLAS_ALLAPOT_TONES } from "@erp/bizonylat/client";
import { Allapot, PageHeader, Tabla } from "@/components/page";
import { datum, huf } from "@/lib/format";
import { getPortalNezo } from "@/lib/portal-nezo";
import { portalIgazolasok } from "@/lib/portal-api";

export const metadata = { title: "Teljesítésigazolások" };

export default async function IgazolasokPage() {
  const nezo = await getPortalNezo();
  const { data } = await portalIgazolasok(nezo);
  return (
    <>
      <PageHeader
        title="Teljesítésigazolások"
        description="A munkák átvételét igazoló dokumentumok. Az aláírásra váró igazolásokat itt fogadhatja el."
      />
      <Tabla
        sorok={data}
        kulcs={(i) => i._id}
        href={(i) => `/teljesitesigazolasok/${i._id}`}
        ures="Még nincs teljesítésigazolás."
        oszlopok={[
          { fejlec: "Azonosító", cella: (i) => i.azonosito },
          { fejlec: "Megnevezés", cella: (i) => i.cim },
          {
            fejlec: "Állapot",
            cella: (i) => (
              <Allapot
                label={IGAZOLAS_ALLAPOT_LABELS[i.allapot]}
                tone={IGAZOLAS_ALLAPOT_TONES[i.allapot]}
              />
            ),
          },
          {
            fejlec: "Bruttó összeg",
            cella: (i) => huf(i.bruttoOsszeg, i.penznem),
            jobbra: true,
          },
          { fejlec: "Dátum", cella: (i) => datum(i.createdAt) },
        ]}
      />
    </>
  );
}
