import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@erp/auth";
import { Badge } from "@erp/ui";
import {
  KESZLET_PERMISSIONS as P,
  RMA_ALLAPOT_LABELS,
  RMA_ALLAPOT_TONES,
  keszletApi,
} from "@erp/keszlet";
import {
  DetailHeader,
  Facts,
  Section,
} from "../../../eszkoz/_components/detail/detail-layout";
import { RmaMuveletek } from "../_components/rma-muveletek";

export const dynamic = "force-dynamic";

const datum = (iso: string) =>
  new Date(iso).toLocaleString("hu-HU", { timeZone: "Europe/Budapest" });

export default async function RmaAdatlapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(P.rmaRead);
  const r = await keszletApi.getRma(id);
  if (!r) notFound();
  const canWrite = await hasPermission(P.rmaWrite);
  const allapot = r.allapot as keyof typeof RMA_ALLAPOT_LABELS;
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:gap-5 md:p-6">
      <DetailHeader
        title={r.sorszam}
        subtitle={`${r.termekNev} · ${r.partnerNev}`}
        backHref="/keszlet/rma"
        backLabel="Vissza az RMA ügyekhez"
        chips={
          <Badge variant={RMA_ALLAPOT_TONES[allapot]}>
            {RMA_ALLAPOT_LABELS[allapot]}
          </Badge>
        }
        actions={
          canWrite ? (
            <RmaMuveletek
              id={r._id}
              atmenetek={r.lehetsegesAtmenetek}
              aktiv={r.lehetsegesAtmenetek.length > 0}
              beszallitoNev={r.beszallitoNev}
            />
          ) : undefined
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Ügy adatai" mode="readonly">
            <Facts
              columns={2}
              items={[
                { label: "Termék", value: `${r.termekNev} (${r.termekKod})` },
                { label: "Mennyiség", value: r.mennyiseg },
                { label: "Gyári szám", value: r.gyariSzam },
                { label: "Ügyfél", value: r.partnerNev },
                { label: "Beszállító", value: r.beszallitoNev },
                { label: "Felelős", value: r.felelosNev },
                { label: "Megjegyzés", value: r.megjegyzes },
              ]}
            />
          </Section>
        </div>
        <Section title="Előzmények" mode="log">
          <ol className="flex flex-col gap-3 text-sm">
            {r.elozmenyek.map((e, i) => (
              <li key={i}>
                <Badge variant={RMA_ALLAPOT_TONES[e.allapot]}>
                  {RMA_ALLAPOT_LABELS[e.allapot]}
                </Badge>{" "}
                <span className="text-muted-foreground text-xs">{datum(e.at)}</span>
                {e.jegyzet && <p className="mt-1">{e.jegyzet}</p>}
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  );
}
