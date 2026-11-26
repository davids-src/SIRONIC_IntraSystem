import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { hasPermission, requirePermission } from "@erp/auth";
import { getBranding } from "@erp/db-core";
import { Badge, Button, Container } from "@erp/ui";
import { szervizApi } from "@erp/szerviz";
import {
  MUNKALAP_ALLAPOT_LABELS,
  MUNKALAP_SOR_TIPUS_LABELS,
  SZERVIZ_PERMISSIONS as P,
  munkalapHtml,
} from "@erp/szerviz/client";
import {
  Facts,
  PageHeader,
  Section,
} from "@/app/(dashboard)/partner/_components/form-ui";
import { ArchiveControls } from "@/app/(dashboard)/partner/_components/archive-controls";
import {
  archivMunkalapAction,
  ujraKiadKeszletAction,
  visszaallitMunkalapAction,
} from "../../actions";
import { AkcioGomb } from "../../_components/akcio-gomb";
import { LezarasDialog } from "../../_components/lezaras-dialog";
import { PdfGomb } from "../../_components/pdf-gomb";

const FT = new Intl.NumberFormat("hu-HU");
const datum = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("hu-HU") : undefined;

export default async function MunkalapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePermission(P.munkalapRead);
  const m = await szervizApi.getMunkalap(id, { kind: "staff", userId: user.id });
  if (!m) notFound();
  const [canWrite, canLezar, canDelete, branding] = await Promise.all([
    hasPermission(P.munkalapWrite),
    hasPermission(P.munkalapLezar),
    hasPermission(P.munkalapDelete),
    getBranding(),
  ]);
  const piszkozat = m.allapot === "piszkozat" && !m.archivalt;
  const html = munkalapHtml(m, { nev: branding.companyName });
  const keszletHiba =
    m.allapot === "lezart" && !m.keszletKiadva && m.sorok.some((s) => s.keszletbolKiad);

  return (
    <Container className="flex max-w-4xl flex-col gap-4 md:gap-5">
      <PageHeader
        title={m.azonosito}
        subtitle={m.partnerNev ?? m.egyszeriNev}
        chips={
          <>
            <Badge variant="secondary">{MUNKALAP_ALLAPOT_LABELS[m.allapot]}</Badge>
            {m.archivalt && <Badge variant="outline">Archivált</Badge>}
          </>
        }
        actions={
          <>
            <PdfGomb html={html} fajlNev={`${m.azonosito}.pdf`} />
            {canWrite && piszkozat && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/szerviz/munkalapok/${m.id}/edit`}>
                  <PencilIcon className="mr-1 size-4" />
                  Szerkesztés
                </Link>
              </Button>
            )}
            {canLezar && piszkozat && <LezarasDialog munkalapId={m.id} />}
          </>
        }
      />
      <Section title="Adatok">
        <Facts
          items={[
            { label: "Munka dátuma", value: datum(m.munkaDatum) },
            {
              label: "Idő",
              value: m.munkaKezdet ? `${m.munkaKezdet}–${m.munkaVege ?? ""}` : undefined,
            },
            { label: "Szerelő", value: m.szerelo },
            { label: "Kategória", value: m.kategoria },
            { label: "Helyszín", value: m.helyszin },
            {
              label: "Hibajegy",
              value: m.hibajegyId ? (
                <Link className="underline" href={`/szerviz/hibajegyek/${m.hibajegyId}`}>
                  megnyitás
                </Link>
              ) : undefined,
            },
            { label: "Projekt", value: m.projektId },
            {
              label: "Utazás",
              value: m.utazasKm ? `${FT.format(m.utazasKm)} km` : undefined,
            },
            { label: "Lezárva", value: datum(m.lezarva) },
            {
              label: "Készletkiadás",
              value: m.keszletKiadas
                ? `${m.keszletKiadas.ok ? "Sikeres" : "Sikertelen"}${m.keszletKiadas.uzenet ? ` — ${m.keszletKiadas.uzenet}` : ""}`
                : m.allapot === "lezart" && m.keszletKiadva
                  ? "Nem volt kiadandó anyag"
                  : undefined,
            },
          ]}
        />
        <p className="text-sm whitespace-pre-line">{m.leiras}</p>
        {m.megjegyzes && <p className="text-muted-foreground text-sm">{m.megjegyzes}</p>}
        {keszletHiba && canLezar && (
          <div className="flex flex-wrap items-center gap-3 rounded border border-red-300 p-2 text-sm">
            A készletkiadás nem sikerült — az anyagok még a készletben vannak.
            <AkcioGomb
              action={ujraKiadKeszletAction.bind(null, m.id)}
              label="Készletkiadás újrapróbálása"
            />
          </div>
        )}
      </Section>
      <Section title="Tételek">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="text-muted-foreground text-left text-xs">
              <tr>
                <th className="p-1">Típus</th>
                <th className="p-1">Megnevezés</th>
                <th className="p-1 text-right">Menny.</th>
                <th className="p-1 text-right">Nettó egységár</th>
                <th className="p-1">Készletből</th>
              </tr>
            </thead>
            <tbody>
              {m.sorok.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="p-1">{MUNKALAP_SOR_TIPUS_LABELS[s.tipus]}</td>
                  <td className="p-1">{s.leiras}</td>
                  <td className="p-1 text-right">
                    {FT.format(s.mennyiseg)} {s.egyseg}
                  </td>
                  <td className="p-1 text-right">
                    {s.nettoEgysegar !== undefined ? FT.format(s.nettoEgysegar) : ""}
                  </td>
                  <td className="p-1">{s.keszletbolKiad ? "igen" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-right text-sm">
          Munkaóra: {FT.format(m.osszegzes.munkaOra)} ·{" "}
          <strong>Nettó: {FT.format(m.osszegzes.osszesNetto)} Ft</strong>
        </p>
      </Section>
      <Section title="Aláírások">
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          {[
            { cim: `Szerelő: ${m.szerelo}`, kep: m.szereloAlairas },
            { cim: `Ügyfél: ${m.ugyfelNev ?? "—"}`, kep: m.ugyfelAlairas },
          ].map((a) => (
            <div key={a.cim}>
              <div className="text-muted-foreground mb-1 text-xs">{a.cim}</div>
              {a.kep?.startsWith("data:") ? (
                <img src={a.kep} alt={a.cim} className="h-20 rounded border bg-white" />
              ) : a.kep ? (
                <span>Mentett aláírás (média)</span>
              ) : (
                <span className="text-muted-foreground">Nincs aláírás</span>
              )}
            </div>
          ))}
        </div>
      </Section>
      {canWrite && (
        <Section title="Archiválás">
          <ArchiveControls
            subject="munkalap"
            archived={m.archivalt}
            archiveReason={m.archivalasOka}
            archiveAction={
              m.archivalt ? undefined : archivMunkalapAction.bind(null, m.id)
            }
            restoreAction={
              canDelete ? visszaallitMunkalapAction.bind(null, m.id) : undefined
            }
          />
        </Section>
      )}
    </Container>
  );
}
