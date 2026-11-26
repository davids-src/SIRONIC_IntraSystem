import { PageHeader, Tabla } from "@/components/page";
import { datum } from "@/lib/format";
import { getPortalNezo } from "@/lib/portal-nezo";
import { portalMunkalapok } from "@/lib/portal-api";

export const metadata = { title: "Munkalapok" };

export default async function MunkalapokPage() {
  const nezo = await getPortalNezo();
  const { data } = await portalMunkalapok(nezo);
  return (
    <>
      <PageHeader title="Munkalapok" description="Az Önnél elvégzett, lezárt munkák." />
      <Tabla
        sorok={data}
        kulcs={(m) => m._id}
        href={(m) => `/munkalapok/${m._id}`}
        ures="Még nincs lezárt munkalap."
        oszlopok={[
          { fejlec: "Azonosító", cella: (m) => m.azonosito },
          { fejlec: "Munka dátuma", cella: (m) => datum(m.munkaDatum) },
          { fejlec: "Kategória", cella: (m) => m.kategoria },
          { fejlec: "Munkaóra", cella: (m) => m.munkaOra, jobbra: true },
        ]}
      />
    </>
  );
}
