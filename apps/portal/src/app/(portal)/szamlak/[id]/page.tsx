import { notFound } from "next/navigation";
import { SZAMLA_ALLAPOT_LABELS, SZAMLA_ALLAPOT_TONES } from "@erp/bizonylat/client";
import { Adat, Allapot, PageHeader, Tabla } from "@/components/page";
import { datum, huf } from "@/lib/format";
import { getPortalNezo } from "@/lib/portal-nezo";
import { portalSzamla } from "@/lib/portal-api";

export const metadata = { title: "Számla" };

export default async function SzamlaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nezo = await getPortalNezo();
  const s = await portalSzamla(nezo, id);
  if (!s) notFound();
  return (
    <>
      <PageHeader
        title={`Számla ${s.szamlaszam ?? s.azonosito}`}
        actions={
          <Allapot
            label={SZAMLA_ALLAPOT_LABELS[s.allapot]}
            tone={SZAMLA_ALLAPOT_TONES[s.allapot]}
          />
        }
      />
      <dl className="mb-6 grid gap-4 sm:grid-cols-3">
        <Adat cimke="Kiállítva">{datum(s.kiallitva)}</Adat>
        <Adat cimke="Esedékes">{datum(s.esedekes)}</Adat>
        <Adat cimke="Kifizetve">{datum(s.kifizetve)}</Adat>
        <Adat cimke="Végösszeg (bruttó)">{huf(s.osszeg, s.penznem)}</Adat>
      </dl>
      <Tabla
        sorok={s.sorok.map((x, i) => ({ ...x, i }))}
        kulcs={(x) => String(x.i)}
        oszlopok={[
          { fejlec: "Megnevezés", cella: (x) => x.leiras },
          {
            fejlec: "Mennyiség",
            cella: (x) => `${x.mennyiseg} ${x.egyseg}`,
            jobbra: true,
          },
          {
            fejlec: "Nettó egységár",
            cella: (x) => huf(x.nettoEgysegar, s.penznem),
            jobbra: true,
          },
          { fejlec: "ÁFA", cella: (x) => `${x.afaKulcs}%`, jobbra: true },
        ]}
      />
    </>
  );
}
