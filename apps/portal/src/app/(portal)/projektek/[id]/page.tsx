import { notFound } from "next/navigation";
import {
  FAZIS_ALLAPOT_LABELS,
  FAZIS_ALLAPOT_TONES,
  PROJEKT_ALLAPOT_LABELS,
  PROJEKT_ALLAPOT_TONES,
  STAGING_JOVAHAGYAS_LABELS,
} from "@erp/projekt/client";
import { Adat, Allapot, PageHeader, Tabla } from "@/components/page";
import { datum } from "@/lib/format";
import { getPortalNezo } from "@/lib/portal-nezo";
import { portalProjekt } from "@/lib/portal-api";

export const metadata = { title: "Projekt" };

export default async function ProjektPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nezo = await getPortalNezo();
  const p = await portalProjekt(nezo, id);
  if (!p) notFound();
  return (
    <>
      <PageHeader
        title={`${p.azonosito} — ${p.nev}`}
        actions={
          <Allapot
            label={PROJEKT_ALLAPOT_LABELS[p.allapot]}
            tone={PROJEKT_ALLAPOT_TONES[p.allapot]}
          />
        }
      />
      <dl className="mb-6 grid gap-4 sm:grid-cols-3">
        <Adat cimke="Készültség">{p.szazalek}%</Adat>
        <Adat cimke="Határidő">{datum(p.hatarido)}</Adat>
      </dl>
      {p.leiras && <p className="mb-6 text-sm whitespace-pre-wrap">{p.leiras}</p>}
      <h2 className="mb-2 font-medium">Fázisok</h2>
      <Tabla
        sorok={p.fazisok.map((f, i) => ({ ...f, i }))}
        kulcs={(f) => String(f.i)}
        oszlopok={[
          { fejlec: "Fázis", cella: (f) => f.nev },
          {
            fejlec: "Állapot",
            cella: (f) => (
              <Allapot
                label={FAZIS_ALLAPOT_LABELS[f.allapot]}
                tone={FAZIS_ALLAPOT_TONES[f.allapot]}
              />
            ),
          },
          { fejlec: "Határidő", cella: (f) => datum(f.hatarido) },
          { fejlec: "Készültség", cella: (f) => `${f.szazalek}%`, jobbra: true },
        ]}
      />
      {p.stagingLinkek.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 font-medium">Előnézeti hivatkozások</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {p.stagingLinkek.map((s) => (
              <li key={s.id}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {s.cimke}
                </a>{" "}
                <span className="text-muted-foreground">
                  ({STAGING_JOVAHAGYAS_LABELS[s.jovahagyas]})
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
