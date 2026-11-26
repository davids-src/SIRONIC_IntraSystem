import Link from "next/link";
import { Button } from "@erp/ui";
import {
  HIBAJEGY_ALLAPOT_LABELS,
  HIBAJEGY_ALLAPOT_TONES,
  HIBAJEGY_PRIORITAS_LABELS,
} from "@erp/szerviz/client";
import { PORTAL_PERMISSIONS } from "@erp/portal-auth/constants";
import { Allapot, PageHeader, Tabla } from "@/components/page";
import { datum } from "@/lib/format";
import { can } from "@/lib/nezo";
import { getPortalNezo } from "@/lib/portal-nezo";
import { portalHibajegyek } from "@/lib/portal-api";

export const metadata = { title: "Hibajegyek" };

export default async function HibajegyekPage() {
  const nezo = await getPortalNezo();
  const { data } = await portalHibajegyek(nezo);
  return (
    <>
      <PageHeader
        title="Hibajegyek"
        description="Bejelentett hibák és kérések, azok állapota."
        actions={
          can(nezo, PORTAL_PERMISSIONS.ticketCreate) && (
            <Button asChild>
              <Link href="/hibajegyek/uj">Új hibajegy</Link>
            </Button>
          )
        }
      />
      <Tabla
        sorok={data}
        kulcs={(h) => h._id}
        href={(h) => `/hibajegyek/${h._id}`}
        ures="Még nincs hibajegye."
        oszlopok={[
          { fejlec: "Azonosító", cella: (h) => h.azonosito },
          { fejlec: "Tárgy", cella: (h) => h.targy },
          {
            fejlec: "Állapot",
            cella: (h) => (
              <Allapot
                label={HIBAJEGY_ALLAPOT_LABELS[h.allapot]}
                tone={HIBAJEGY_ALLAPOT_TONES[h.allapot]}
              />
            ),
          },
          { fejlec: "Prioritás", cella: (h) => HIBAJEGY_PRIORITAS_LABELS[h.prioritas] },
          { fejlec: "Bejelentve", cella: (h) => datum(h.createdAt) },
        ]}
      />
    </>
  );
}
