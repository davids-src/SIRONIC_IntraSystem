import { SZAMLA_ALLAPOT_LABELS, SZAMLA_ALLAPOT_TONES } from "@erp/bizonylat/client";
import { Allapot, PageHeader, Tabla } from "@/components/page";
import { datum, huf } from "@/lib/format";
import { getPortalNezo } from "@/lib/portal-nezo";
import { portalSzamlak } from "@/lib/portal-api";

export const metadata = { title: "Számlák" };

export default async function SzamlakPage() {
  const nezo = await getPortalNezo();
  const { data } = await portalSzamlak(nezo);
  return (
    <>
      <PageHeader
        title="Számlák"
        description="Az Önnek kiállított számlák (csak megtekinthetők)."
      />
      <Tabla
        sorok={data}
        kulcs={(s) => s.id}
        href={(s) => `/szamlak/${s.id}`}
        ures="Még nincs kiállított számla."
        oszlopok={[
          { fejlec: "Számlaszám", cella: (s) => s.szamlaszam ?? s.azonosito },
          {
            fejlec: "Állapot",
            cella: (s) => (
              <Allapot
                label={SZAMLA_ALLAPOT_LABELS[s.allapot]}
                tone={SZAMLA_ALLAPOT_TONES[s.allapot]}
              />
            ),
          },
          { fejlec: "Összeg", cella: (s) => huf(s.osszeg, s.penznem), jobbra: true },
          { fejlec: "Kiállítva", cella: (s) => datum(s.kiallitva) },
          { fejlec: "Esedékes", cella: (s) => datum(s.esedekes) },
        ]}
      />
    </>
  );
}
