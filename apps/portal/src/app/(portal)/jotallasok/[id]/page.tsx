import { notFound } from "next/navigation";
import { JOTALLAS_ALLAPOT_LABELS, JOTALLAS_ALLAPOT_TONES } from "@erp/bizonylat/client";
import { Adat, Allapot, PageHeader, Tabla } from "@/components/page";
import { datum } from "@/lib/format";
import { getPortalNezo } from "@/lib/portal-nezo";
import { portalJotallas } from "@/lib/portal-api";

export const metadata = { title: "Jótállási jegy" };

export default async function JotallasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nezo = await getPortalNezo();
  const j = await portalJotallas(nezo, id);
  if (!j) notFound();
  return (
    <>
      <PageHeader
        title={`Jótállási jegy ${j.azonosito}`}
        actions={
          <Allapot
            label={JOTALLAS_ALLAPOT_LABELS[j.allapot]}
            tone={JOTALLAS_ALLAPOT_TONES[j.allapot]}
          />
        }
      />
      <dl className="mb-6 grid gap-4 sm:grid-cols-3">
        <Adat cimke="Kiállítva">{datum(j.kiallitasNap)}</Adat>
        <Adat cimke="Számlaszám">{j.szamlaszam ?? "—"}</Adat>
        <Adat cimke="Lejárat">{datum(j.lejarat)}</Adat>
      </dl>
      <Tabla
        sorok={j.sorok.map((s, i) => ({ ...s, i }))}
        kulcs={(s) => String(s.i)}
        oszlopok={[
          { fejlec: "Termék", cella: (s) => s.termekNev },
          { fejlec: "Gyári szám", cella: (s) => s.gyariSzam ?? "—" },
          { fejlec: "Jótállás", cella: (s) => `${s.evek} év` },
          { fejlec: "Kezdete", cella: (s) => datum(s.kezdet) },
          { fejlec: "Vége", cella: (s) => datum(s.vege) },
        ]}
      />
      <section className="mt-6 rounded border p-4 text-sm">
        <h2 className="mb-2 font-medium">Jótállási feltételek</h2>
        <p className="whitespace-pre-wrap">{j.jogiSzoveg}</p>
      </section>
    </>
  );
}
