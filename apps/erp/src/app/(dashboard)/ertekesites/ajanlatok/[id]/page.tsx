import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { hasPermission, requirePermission } from "@erp/auth";
import { getBranding } from "@erp/db-core";
import { Badge, Button, Container } from "@erp/ui";
import { ertekesitesApi } from "@erp/ertekesites";
import {
  AJANLAT_ALLAPOT_LABELS,
  AJANLAT_ATMENETEK,
  ELVESZTES_OK_LABELS,
  ERTEKESITES_PERMISSIONS as P,
  SOR_FORRAS_LABELS,
  ajanlatHtml,
} from "@erp/ertekesites/client";
import {
  Facts,
  PageHeader,
  Section,
} from "@/app/(dashboard)/partner/_components/form-ui";
import { ArchiveControls } from "@/app/(dashboard)/partner/_components/archive-controls";
import {
  ajanlatAllapotAction,
  archivAjanlatAction,
  visszaallitAjanlatAction,
} from "../../actions";
import { AllapotPanel, type AllapotLehetoseg } from "../../_components/allapot-panel";
import { PdfGomb } from "../../_components/pdf-gomb";
import { UtankovetesForm } from "../../_components/utankovetes-form";

const FT = new Intl.NumberFormat("hu-HU");
const datum = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("hu-HU") : undefined;
const datumIdo = (iso: string) => new Date(iso).toLocaleString("hu-HU");

export default async function AjanlatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(P.ajanlatRead);
  const viewer = { userId: user.id, permissions: user.permissions };
  const a = await ertekesitesApi.getAjanlat(viewer, id);
  if (!a) notFound();
  const [canWrite, canKuld, canDelete, branding] = await Promise.all([
    hasPermission(P.ajanlatWrite),
    hasPermission(P.ajanlatKuld),
    hasPermission(P.ajanlatDelete),
    getBranding(),
  ]);
  const szerkesztheto = canWrite && a.allapot === "piszkozat" && !a.archivalt;
  const lehetosegek: AllapotLehetoseg[] = a.archivalt
    ? []
    : AJANLAT_ATMENETEK[a.allapot]
        .filter((n) => (n === "elkuldve" ? canKuld : canWrite))
        .map((n) => ({
          allapot: n,
          label: `${AJANLAT_ALLAPOT_LABELS[n]} állapotba`,
          mezo: n === "elutasitva" ? ("elvesztes" as const) : undefined,
          kiemelt: n === "elkuldve" || n === "elfogadva",
        }));
  const html = ajanlatHtml(a, { nev: branding.companyName });

  return (
    <Container className="flex max-w-5xl flex-col gap-4 md:gap-5">
      <PageHeader
        title={a.cim}
        subtitle={`${a.azonosito} · ${a.partnerNev}`}
        chips={
          <>
            <Badge variant="secondary">{AJANLAT_ALLAPOT_LABELS[a.allapot]}</Badge>
            {a.archivalt && <Badge variant="outline">Archivált</Badge>}
          </>
        }
        actions={
          <>
            <PdfGomb html={html} fajlNev={`${a.azonosito}.pdf`} />
            {szerkesztheto && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/ertekesites/ajanlatok/${a.id}/edit`}>
                  <PencilIcon className="mr-1 size-4" />
                  Szerkesztés
                </Link>
              </Button>
            )}
          </>
        }
      />

      <Section title="Adatok">
        <Facts
          items={[
            { label: "Partner", value: a.partnerNev },
            { label: "Cím", value: a.partnerCim },
            { label: "Adószám", value: a.partnerAdoszam },
            { label: "Érvényes", value: datum(a.ervenyesseg) },
            { label: "Üzleti egység", value: a.uzletiEgyseg },
            { label: "Elküldve", value: datum(a.kuldveAt) },
            { label: "Utánkövetés", value: datum(a.utankovetes) },
            {
              label: "Elvesztés oka",
              value: a.elvesztesOka && ELVESZTES_OK_LABELS[a.elvesztesOka],
            },
          ]}
        />
        {a.megjegyzes && <p className="text-sm whitespace-pre-line">{a.megjegyzes}</p>}
      </Section>

      <Section
        title="Tételek"
        description="A tételek ára a létrehozáskor befagyasztott érték."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-muted-foreground text-left text-xs">
              <tr>
                <th className="p-1">Megnevezés</th>
                <th className="p-1 text-right">Menny.</th>
                <th className="p-1 text-right">Nettó egységár</th>
                <th className="p-1 text-right">Kedv.</th>
                <th className="p-1 text-right">ÁFA</th>
              </tr>
            </thead>
            <tbody>
              {a.sorok.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="p-1">
                    {s.leiras}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {SOR_FORRAS_LABELS[s.forras]}
                      {s.arSnapshot ? ` · ${s.arSnapshot.kod}` : ""}
                    </span>
                  </td>
                  <td className="p-1 text-right">
                    {FT.format(s.mennyiseg)} {s.egyseg}
                  </td>
                  <td className="p-1 text-right">{FT.format(s.nettoEgysegar)}</td>
                  <td className="p-1 text-right">
                    {s.kedvezmenySzazalek ? `${s.kedvezmenySzazalek}%` : ""}
                  </td>
                  <td className="p-1 text-right">{s.afaKulcs}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="ml-auto grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Nettó összesen</dt>
          <dd className="text-right">
            {FT.format(a.osszegek.nettoOsszeg)} {a.penznem}
          </dd>
          {a.osszegek.globalisKedvezmenyOsszeg > 0 && (
            <>
              <dt className="text-muted-foreground">
                Kedvezmény ({a.osszegek.globalisKedvezmenySzazalek}%)
              </dt>
              <dd className="text-right">
                -{FT.format(a.osszegek.globalisKedvezmenyOsszeg)} {a.penznem}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">ÁFA</dt>
          <dd className="text-right">
            {FT.format(a.osszegek.afaOsszeg)} {a.penznem}
          </dd>
          <dt className="font-semibold">Bruttó végösszeg</dt>
          <dd className="text-right font-semibold">
            {FT.format(a.osszegek.bruttoOsszeg)} {a.penznem}
          </dd>
          {a.fedezet && (
            <>
              <dt className="text-muted-foreground">Fedezet (belső)</dt>
              <dd className="text-right">
                {FT.format(a.fedezet.fedezet)} {a.penznem} ({a.fedezet.fedezetSzazalek}%)
              </dd>
            </>
          )}
        </dl>
      </Section>

      {lehetosegek.length > 0 && (
        <Section title="Állapot módosítása">
          <AllapotPanel
            action={ajanlatAllapotAction.bind(null, a.id)}
            lehetosegek={lehetosegek}
          />
        </Section>
      )}

      {canWrite && !a.archivalt && (
        <Section title="Utánkövetés">
          <UtankovetesForm
            ajanlatId={a.id}
            ertekek={{
              utankovetes: a.utankovetes,
              utankovetesMegjegyzes: a.utankovetesMegjegyzes,
              kovetkezoLepes: a.kovetkezoLepes,
              kovetkezoLepesIdopont: a.kovetkezoLepesIdopont,
            }}
          />
        </Section>
      )}

      <Section title="Állapot-előzmények">
        <ul className="flex flex-col gap-1 text-sm">
          {a.elozmenyek.map((e, i) => (
            <li key={i}>
              <span className="text-muted-foreground">{datumIdo(e.idopont)}</span> ·{" "}
              {AJANLAT_ALLAPOT_LABELS[e.allapot]}
              {e.megjegyzes ? ` — ${e.megjegyzes}` : ""}
            </li>
          ))}
        </ul>
      </Section>

      {(canWrite || canDelete) && (
        <Section
          title="Archiválás"
          description="Az ajánlat nem törölhető, csak archiválható (ok megadásával); az archivált ajánlat visszaállítható."
        >
          <ArchiveControls
            subject="ajánlat"
            archived={a.archivalt}
            archiveReason={a.archivalasOka}
            archiveAction={canWrite ? archivAjanlatAction.bind(null, a.id) : undefined}
            restoreAction={
              canDelete ? visszaallitAjanlatAction.bind(null, a.id) : undefined
            }
          />
        </Section>
      )}
    </Container>
  );
}
