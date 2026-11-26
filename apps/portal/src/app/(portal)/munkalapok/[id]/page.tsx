import { notFound } from "next/navigation";
import { MUNKALAP_SOR_TIPUS_LABELS } from "@erp/szerviz/client";
import { Adat, PageHeader, Tabla } from "@/components/page";
import { datum, datumIdo } from "@/lib/format";
import { getPortalNezo } from "@/lib/portal-nezo";
import { portalMunkalap } from "@/lib/portal-api";

export const metadata = { title: "Munkalap" };

export default async function MunkalapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nezo = await getPortalNezo();
  const m = await portalMunkalap(nezo, id);
  if (!m) notFound();
  return (
    <>
      <PageHeader title={`${m.azonosito} — munkalap`} />
      <dl className="mb-6 grid gap-4 sm:grid-cols-3">
        <Adat cimke="Munka dátuma">{datum(m.munkaDatum)}</Adat>
        <Adat cimke="Szerelő">{m.szerelo}</Adat>
        <Adat cimke="Helyszín">{m.helyszin ?? "—"}</Adat>
        <Adat cimke="Kategória">{m.kategoria}</Adat>
        <Adat cimke="Munkaóra">{m.munkaOra}</Adat>
        <Adat cimke="Lezárva">{datumIdo(m.lezarva)}</Adat>
      </dl>
      <section className="mb-6">
        <h2 className="mb-2 font-medium">Elvégzett munka</h2>
        <p className="text-sm whitespace-pre-wrap">{m.leiras}</p>
      </section>
      <h2 className="mb-2 font-medium">Tételek</h2>
      <Tabla
        sorok={m.sorok.map((s, i) => ({ ...s, i }))}
        kulcs={(s) => String(s.i)}
        oszlopok={[
          { fejlec: "Típus", cella: (s) => MUNKALAP_SOR_TIPUS_LABELS[s.tipus] },
          { fejlec: "Megnevezés", cella: (s) => s.leiras },
          {
            fejlec: "Mennyiség",
            cella: (s) => `${s.mennyiseg} ${s.egyseg}`,
            jobbra: true,
          },
        ]}
      />
    </>
  );
}
