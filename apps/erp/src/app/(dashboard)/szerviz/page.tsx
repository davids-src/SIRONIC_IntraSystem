import Link from "next/link";
import {
  AlarmClockIcon,
  CalendarClockIcon,
  ClipboardListIcon,
  FlameIcon,
  TicketIcon,
} from "lucide-react";
import { requireAuth } from "@erp/auth";
import { Badge, Container } from "@erp/ui";
import { szervizApi } from "@erp/szerviz";
import { SZERVIZ_PERMISSIONS as P } from "@erp/szerviz/client";
import { KpiTile } from "@/components/kpi-tile";
import { PageHeader, Section } from "@/app/(dashboard)/partner/_components/form-ui";

export const dynamic = "force-dynamic";

/** Module overview: KPI tiles (each gated like the list behind it) and the due maintenance plans. */
export default async function SzervizAttekintesPage() {
  const user = await requireAuth();
  const p = user.permissions;
  const [hibajegyOlvas, munkalapOlvas, karbOlvas] = [
    p.includes(P.hibajegyRead),
    p.includes(P.munkalapRead),
    p.includes(P.karbantartasRead),
  ];
  const a = await szervizApi.getAttekintes();
  const esedekes = [...a.esedekes.keso, ...a.esedekes.hamarosan];

  return (
    <Container className="flex max-w-6xl flex-col gap-4 md:gap-6">
      <PageHeader
        title="Szerviz"
        subtitle="Hibajegyek, munkalapok és karbantartási tervek."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {hibajegyOlvas && (
          <>
            <KpiTile
              label="Nyitott hibajegy"
              value={a.hibajegy.nyitott}
              hint={`${a.hibajegy.uj} új`}
              tone={a.hibajegy.uj > 0 ? "warning" : "info"}
              icon={<TicketIcon className="size-5" />}
              href="/szerviz/hibajegyek"
            />
            <KpiTile
              label="Kritikus"
              hint="nyitott hibajegyek"
              value={a.hibajegy.kritikus}
              tone={a.hibajegy.kritikus > 0 ? "danger" : "success"}
              icon={<FlameIcon className="size-5" />}
              href="/szerviz/hibajegyek"
            />
          </>
        )}
        {munkalapOlvas && (
          <KpiTile
            label="Munkalap piszkozat"
            hint={`${a.munkalap.lezartHonap} lezárt ebben a hónapban`}
            value={a.munkalap.piszkozat}
            tone={a.munkalap.keszletHibas > 0 ? "danger" : "info"}
            icon={<ClipboardListIcon className="size-5" />}
            href="/szerviz/munkalapok"
          />
        )}
        {karbOlvas && (
          <KpiTile
            label="Esedékes karbantartás"
            hint={`${a.esedekes.keso.length} lejárt`}
            value={esedekes.length}
            tone={
              a.esedekes.keso.length > 0
                ? "danger"
                : esedekes.length > 0
                  ? "warning"
                  : "success"
            }
            icon={<AlarmClockIcon className="size-5" />}
            href="/szerviz/karbantartas"
          />
        )}
      </div>
      {karbOlvas && (
        <Section
          title="Esedékes karbantartások"
          description="Lejárt és hamarosan esedékes tervek."
        >
          {esedekes.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nincs esedékes karbantartás.</p>
          ) : (
            <ul className="divide-y text-sm">
              {esedekes.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <Link
                    href={`/szerviz/karbantartas/${e.id}`}
                    className="font-medium hover:underline"
                  >
                    <CalendarClockIcon className="mr-1 inline size-4" />
                    {e.cim}
                    {e.partnerNev ? ` — ${e.partnerNev}` : ""}
                  </Link>
                  <span className="flex items-center gap-2">
                    {e.kovetkezoEsedekes}
                    <Badge variant={e.allapot === "lejart" ? "destructive" : "secondary"}>
                      {e.allapot === "lejart"
                        ? `${Math.abs(e.napokHatra)} napja lejárt`
                        : `${e.napokHatra} nap múlva`}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </Container>
  );
}
