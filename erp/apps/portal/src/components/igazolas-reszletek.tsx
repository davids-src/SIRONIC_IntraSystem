import type { IgazolasDetail } from "@erp/bizonylat/client";
import { IGAZOLAS_ALLAPOT_LABELS, IGAZOLAS_ALLAPOT_TONES } from "@erp/bizonylat/client";
import { Adat, Allapot, Tabla } from "@/components/page";
import { datum, datumIdo, huf } from "@/lib/format";

/** Read-only certificate body, shared by the logged-in page and the public magic-link page. */
export function IgazolasReszletek({ d }: { d: IgazolasDetail }) {
  return (
    <>
      <dl className="mb-6 grid gap-4 sm:grid-cols-3">
        <Adat cimke="Azonosító">{d.azonosito}</Adat>
        <Adat cimke="Partner">{d.partnerNev}</Adat>
        <Adat cimke="Állapot">
          <Allapot
            label={IGAZOLAS_ALLAPOT_LABELS[d.allapot]}
            tone={IGAZOLAS_ALLAPOT_TONES[d.allapot]}
          />
        </Adat>
        <Adat cimke="Időszak">
          {d.idoszakKezdet ? `${datum(d.idoszakKezdet)} – ${datum(d.idoszakVege)}` : "—"}
        </Adat>
        <Adat cimke="Munkaóra">{d.osszOra ?? "—"}</Adat>
        <Adat cimke="Elküldve">{datumIdo(d.kuldveAt)}</Adat>
      </dl>
      <section className="mb-6">
        <h2 className="mb-2 font-medium">Elvégzett munka</h2>
        <p className="text-sm whitespace-pre-wrap">{d.munkaOsszegzes}</p>
      </section>
      <h2 className="mb-2 font-medium">Tételek</h2>
      <Tabla
        sorok={d.sorok.map((s, i) => ({ ...s, i }))}
        kulcs={(s) => String(s.i)}
        oszlopok={[
          { fejlec: "Megnevezés", cella: (s) => s.leiras },
          {
            fejlec: "Mennyiség",
            cella: (s) => `${s.mennyiseg} ${s.egyseg}`,
            jobbra: true,
          },
          {
            fejlec: "Nettó egységár",
            cella: (s) => huf(s.nettoEgysegar, d.penznem),
            jobbra: true,
          },
          { fejlec: "ÁFA", cella: (s) => `${s.afaKulcs}%`, jobbra: true },
        ]}
      />
      <dl className="mt-4 ml-auto grid max-w-xs gap-1 text-sm">
        <div className="flex justify-between">
          <dt>Nettó</dt>
          <dd>{huf(d.osszegek.nettoOsszeg, d.penznem)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>ÁFA</dt>
          <dd>{huf(d.osszegek.afaOsszeg, d.penznem)}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>Bruttó</dt>
          <dd>{huf(d.osszegek.bruttoOsszeg, d.penznem)}</dd>
        </div>
      </dl>
      {d.alairas && (
        <section className="mt-6 rounded border p-4 text-sm">
          <h2 className="mb-2 font-medium">Aláírás</h2>
          <p>
            {d.alairas.nev} ({d.alairas.beosztas}) · {datumIdo(d.alairas.alairtAt)}
          </p>
          {d.alairas.kep.startsWith("data:image/") && (
            <img
              src={d.alairas.kep}
              alt="Aláírás"
              className="mt-2 h-20 rounded border bg-white"
            />
          )}
        </section>
      )}
      {d.elutasitasOka && (
        <section className="mt-6 rounded border border-red-300 bg-red-50 p-4 text-sm">
          <h2 className="mb-1 font-medium">Elutasítás oka</h2>
          <p className="whitespace-pre-wrap">{d.elutasitasOka}</p>
        </section>
      )}
    </>
  );
}
