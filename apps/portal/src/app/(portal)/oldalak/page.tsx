import { PageHeader, Tabla } from "@/components/page";
import { getPortalNezo } from "@/lib/portal-nezo";
import { portalOldalak } from "@/lib/portal-api";

export const metadata = { title: "Weboldalak" };

export default async function OldalakPage() {
  const nezo = await getPortalNezo();
  const oldalak = await portalOldalak(nezo);
  return (
    <>
      <PageHeader
        title="Weboldalak"
        description="Az Ön weboldalai és webes szolgáltatásai."
      />
      <Tabla
        sorok={oldalak}
        kulcs={(o) => o.id}
        ures="Még nincs megjelenítendő weboldal. Ha többet vár, jelezze az ügyfélszolgálatnak."
        oszlopok={[
          { fejlec: "Megnevezés", cella: (o) => o.nev },
          {
            fejlec: "Cím",
            cella: (o) => (
              <a href={o.url} target="_blank" rel="noreferrer" className="underline">
                {o.hostnev}
              </a>
            ),
          },
          {
            fejlec: "További címek",
            cella: (o) => o.hostnevek.slice(1).join(", ") || "—",
          },
        ]}
      />
    </>
  );
}
